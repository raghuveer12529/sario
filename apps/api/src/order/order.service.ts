import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { OrderStatus } from "@sario/db";
import { PrismaService } from "../prisma/prisma.service.js";
import { ShiprocketService } from "../shiprocket/shiprocket.service.js";
import { VendorService } from "../vendor/vendor.service.js";
import { ReturnsService } from "../returns/returns.service.js";
import { captureException } from "../observability/sentry.js";

const BUYER_CANCELLABLE: readonly OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
];
const VENDOR_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.CONFIRMED]: OrderStatus.PACKED,
  [OrderStatus.PACKED]: OrderStatus.SHIPPED,
};

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly shiprocket: ShiprocketService,
    private readonly vendor: VendorService,
    private readonly returns: ReturnsService,
  ) {}

  // ─── Buyer ─────────────────────────────────────────────────────────────────

  async listForBuyer(userId: string, page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        include: {
          items: { include: { variant: { include: { product: { select: { name: true, slug: true } }, images: { where: { isPrimary: true }, take: 1 } } } } },
          shipment: { select: { status: true, trackingUrl: true, estimatedDelivery: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getOrderForBuyer(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { variant: { include: { product: { select: { name: true, slug: true, description: true } } } } } },
        payments: { select: { status: true, method: true, capturedAt: true } },
        shipment: true,
        refunds: true,
      },
    });
    if (!order) throw new NotFoundException("Order not found.");
    if (order.userId !== userId) throw new ForbiddenException();
    return order;
  }

  async cancelOrder(userId: string, orderId: string, reason: string) {
    const order = await this.getOrderForBuyer(userId, orderId);
    if (!BUYER_CANCELLABLE.includes(order.status)) {
      throw new BadRequestException(`Order in ${order.status} status cannot be cancelled.`);
    }

    if (order.status === OrderStatus.CONFIRMED) {
      // Paid order: refund the buyer (also restocks the items) before cancelling.
      await this.returns.issueRefund(orderId, undefined, `Order cancelled: ${reason}`);
    } else {
      // Unpaid (PENDING): nothing was charged — just free the reserved units.
      const items = await this.prisma.orderItem.findMany({
        where: { orderId },
        select: { variantId: true, quantity: true },
      });
      for (const item of items) {
        await this.prisma.inventory
          .update({
            where: { variantId: item.variantId },
            data: { reservedQuantity: { decrement: item.quantity } },
          })
          .catch((err) => {
            this.logger.error(`Inventory write failed for variant ${item.variantId}`, err);
            captureException(err, { variantId: item.variantId });
            return null;
          });
      }
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED, cancellationReason: reason, cancelledAt: new Date() },
    });
  }

  async requestReturn(userId: string, orderId: string, reason: string) {
    const order = await this.getOrderForBuyer(userId, orderId);
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException("Only delivered orders can be returned.");
    }
    const returnWindow = 7 * 24 * 3600 * 1000;
    if (!order.deliveredAt || Date.now() - order.deliveredAt.getTime() > returnWindow) {
      throw new BadRequestException("Return window (7 days) has passed.");
    }
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.RETURN_REQUESTED, notes: reason },
    });
  }

  // ─── Vendor ────────────────────────────────────────────────────────────────

  async listForVendor(userId: string, page: number, limit: number, status?: OrderStatus) {
    const vendorId = await this.vendor.resolveVendorId(userId);
    const where = status ? { vendorId, status } : { vendorId };
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { items: { include: { variant: { include: { product: { select: { name: true, slug: true } }, images: { where: { isPrimary: true }, take: 1 } } } } }, shipment: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async advanceOrderStatus(userId: string, orderId: string) {
    const vendorId = await this.vendor.resolveVendorId(userId);
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException();
    if (order.vendorId !== vendorId) throw new ForbiddenException();

    const nextStatus = VENDOR_TRANSITIONS[order.status];
    if (!nextStatus) throw new BadRequestException(`Cannot advance order in ${order.status} status.`);

    const updateData: Record<string, unknown> = { status: nextStatus };
    if (nextStatus === OrderStatus.PACKED) updateData.packedAt = new Date();
    if (nextStatus === OrderStatus.SHIPPED) updateData.shippedAt = new Date();

    return this.prisma.order.update({ where: { id: orderId }, data: updateData });
  }

  async createShipment(userId: string, orderId: string) {
    const vendorId = await this.vendor.resolveVendorId(userId);
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { variant: true } }, address: true },
    });
    if (!order || order.vendorId !== vendorId) throw new ForbiddenException();
    if (order.status !== OrderStatus.PACKED) throw new BadRequestException("Order must be PACKED first.");

    const result = await this.shiprocket.createShipment({
      orderId: order.id,
      orderDate: order.createdAt.toISOString(),
      pickupLocation: "primary",
      items: order.items.map((i) => ({
        name: i.productSnapshot ? String((i.productSnapshot as Record<string, unknown>)["name"] ?? "") : "",
        sku: i.variant.sku,
        units: i.quantity,
        sellingPrice: Math.round(i.unitPricePaise / 100),
      })),
      deliveryAddress: {
        name: order.address.fullName,
        phone: order.address.phone,
        address: `${order.address.line1}${order.address.line2 ? `, ${order.address.line2}` : ""}`,
        city: order.address.city,
        state: order.address.state,
        pincode: order.address.pincode,
      },
      weightKg: 0.5,
    });

    await this.prisma.shipment.upsert({
      where: { orderId },
      create: {
        orderId,
        shiprocketShipmentId: result.shipment_id,
        awbNumber: result.awb_code,
        courierName: result.courier_name,
        trackingUrl: result.tracking_url,
        status: "CREATED",
      },
      update: {
        shiprocketShipmentId: result.shipment_id,
        awbNumber: result.awb_code,
        courierName: result.courier_name,
        trackingUrl: result.tracking_url,
      },
    });

    return result;
  }

}
