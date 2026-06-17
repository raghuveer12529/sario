import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PayoutStatus } from "@sario/db";
import { PrismaService } from "../prisma/prisma.service.js";
import { RazorpayService } from "../payment/razorpay.service.js";
import { captureException } from "../observability/sentry.js";

interface GroupOrder {
  id: string;
  vendorId: string;
  totalPaise: number;
}

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService,
    private readonly config: ConfigService,
  ) {}

  /** Split a captured payment to each vendor's Route account, retaining commission. Idempotent per order. */
  async createPayoutsForGroup(
    razorpayPaymentId: string,
    orders: GroupOrder[],
    paymentId: string,
  ): Promise<void> {
    const defaultBps = this.config.get<number>("PLATFORM_COMMISSION_BPS", 1500);

    for (const order of orders) {
      const existing = await this.prisma.payout.findUnique({ where: { orderId: order.id } });
      if (existing) continue;

      const vendor = await this.prisma.vendor.findUnique({ where: { id: order.vendorId } });
      const bps = vendor?.commissionBps ?? defaultBps;
      const commissionPaise = Math.round((order.totalPaise * bps) / 10000);
      const netPaise = order.totalPaise - commissionPaise;

      const baseData = {
        orderId: order.id,
        vendorId: order.vendorId,
        paymentId,
        grossPaise: order.totalPaise,
        commissionPaise,
        netPaise,
      };

      if (!vendor?.razorpayAccountId) {
        await this.prisma.payout.create({
          data: { ...baseData, status: PayoutStatus.FAILED, failureReason: "Vendor not linked to Razorpay" },
        });
        this.logger.warn(
          `Vendor ${order.vendorId} not linked — payout for order ${order.id} needs manual handling`,
        );
        continue;
      }

      try {
        const transfer = await this.razorpay.createTransfer(
          razorpayPaymentId,
          vendor.razorpayAccountId,
          netPaise,
        );
        await this.prisma.payout.create({
          data: {
            ...baseData,
            razorpayTransferId: transfer.id,
            status: PayoutStatus.PROCESSED,
            processedAt: new Date(),
          },
        });
      } catch (err) {
        captureException(err, { orderId: order.id });
        this.logger.error(`Payout transfer failed for order ${order.id}`, err);
        await this.prisma.payout.create({
          data: {
            ...baseData,
            status: PayoutStatus.FAILED,
            failureReason: err instanceof Error ? err.message : String(err),
          },
        });
      }
    }
  }
}
