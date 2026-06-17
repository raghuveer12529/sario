import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { PaymentStatus, OrderStatus } from "@sario/db";
import { CheckoutService } from "./checkout.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { CartService } from "../cart/cart.service.js";
import { RazorpayService } from "../payment/razorpay.service.js";
import { RedisService } from "../redis/redis.service.js";

interface MockTx {
  $executeRaw: jest.Mock;
}

const mockPrisma = {
  payment: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  order: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  address: {
    findUnique: jest.fn(),
  },
  cartItem: {
    update: jest.fn(),
  },
  inventory: {
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockCart = {
  getCart: jest.fn(),
  clearCart: jest.fn(),
};

const mockRazorpay = {
  createOrder: jest.fn(),
};

const mockRedis = {
  set: jest.fn(),
};

const fakeAddress = {
  id: "addr_1",
  fullName: "Asha Rao",
  phone: "9876543210",
  line1: "1 Silk St",
  line2: null,
  city: "Chennai",
  state: "TN",
  pincode: "600001",
  country: "IN",
};

function buildCartItem(overrides: Record<string, unknown> = {}) {
  return {
    cartId: "cart_1",
    variantId: "var_1",
    quantity: 2,
    pricePaise: 100000,
    variant: {
      pricePaise: 100000,
      name: "Red / M",
      sku: "SKU-1",
      product: { name: "Kanjivaram Silk", vendorId: "ven_1" },
    },
    ...overrides,
  };
}

describe("CheckoutService", () => {
  let service: CheckoutService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CartService, useValue: mockCart },
        { provide: RazorpayService, useValue: mockRazorpay },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<CheckoutService>(CheckoutService);
  });

  // ─── initiate ──────────────────────────────────────────────────────────────

  describe("initiate", () => {
    it("returns the prior checkout and does NOT re-create the Razorpay order when the idempotency key is reused", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        razorpayOrderId: "rz_order_prior",
        amountPaise: 205000,
      });
      mockPrisma.order.findMany.mockResolvedValue([{ id: "ord_a" }, { id: "ord_b" }]);

      const result = await service.initiate("usr_1", {
        addressId: "addr_1",
        idempotencyKey: "idem-123",
      });

      expect(result).toEqual({
        razorpayOrderId: "rz_order_prior",
        amountPaise: 205000,
        currency: "INR",
        orderIds: ["ord_a", "ord_b"],
      });
      expect(mockRazorpay.createOrder).not.toHaveBeenCalled();
      expect(mockCart.getCart).not.toHaveBeenCalled();
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: { userId: "usr_1", checkoutGroupId: "idem-123" },
        select: { id: true },
      });
    });

    it("refreshes the cart item to the live price and throws when a price is stale", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockCart.getCart.mockResolvedValue({
        items: [
          buildCartItem({
            pricePaise: 90000,
            variant: {
              pricePaise: 100000,
              name: "Red / M",
              sku: "SKU-1",
              product: { name: "Kanjivaram Silk", vendorId: "ven_1" },
            },
          }),
        ],
      });
      mockPrisma.address.findUnique.mockResolvedValue(fakeAddress);
      mockPrisma.cartItem.update.mockResolvedValue({});

      await expect(
        service.initiate("usr_1", { addressId: "addr_1", idempotencyKey: "idem-stale" }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.cartItem.update).toHaveBeenCalledWith({
        where: { cartId_variantId: { cartId: "cart_1", variantId: "var_1" } },
        data: { pricePaise: 100000 },
      });
      expect(mockRazorpay.createOrder).not.toHaveBeenCalled();
    });

    it("throws a BadRequestException naming the product when reservation finds insufficient stock", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockCart.getCart.mockResolvedValue({ items: [buildCartItem()] });
      mockPrisma.address.findUnique.mockResolvedValue(fakeAddress);

      // Run the reservation callback with a tx whose conditional UPDATE affects 0 rows.
      mockPrisma.$transaction.mockImplementation(
        async (cb: (tx: MockTx) => Promise<unknown>) => {
          const tx: MockTx = { $executeRaw: jest.fn().mockResolvedValue(0) };
          return cb(tx);
        },
      );

      await expect(
        service.initiate("usr_1", { addressId: "addr_1", idempotencyKey: "idem-stock" }),
      ).rejects.toThrow(/Kanjivaram Silk/);
      expect(mockRazorpay.createOrder).not.toHaveBeenCalled();
    });
  });

  // ─── confirmPayment ──────────────────────────────────────────────────────────

  describe("confirmPayment", () => {
    it("is a no-op when the payment is already CAPTURED", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: "pay_1",
        orderId: "ord_a",
        status: PaymentStatus.CAPTURED,
      });

      await service.confirmPayment("rz_order_1", "rz_pay_1");

      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.inventory.update).not.toHaveBeenCalled();
      expect(mockCart.clearCart).not.toHaveBeenCalled();
    });

    it("captures the payment, confirms the order group, and decrements inventory once", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: "pay_1",
        orderId: "ord_a",
        status: PaymentStatus.CREATED,
      });
      mockPrisma.payment.update.mockResolvedValue({});
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "ord_a",
        userId: "usr_1",
        checkoutGroupId: "idem-123",
      });
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.order.findMany.mockResolvedValue([
        { id: "ord_a", items: [{ variantId: "var_1", quantity: 2 }] },
      ]);
      mockPrisma.inventory.update.mockResolvedValue({});

      await service.confirmPayment("rz_order_1", "rz_pay_1");

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: "pay_1" },
        data: {
          razorpayPaymentId: "rz_pay_1",
          status: PaymentStatus.CAPTURED,
          capturedAt: expect.any(Date) as Date,
        },
      });
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { userId: "usr_1", checkoutGroupId: "idem-123", status: OrderStatus.PENDING },
        data: { status: OrderStatus.CONFIRMED, confirmedAt: expect.any(Date) as Date },
      });
      expect(mockPrisma.inventory.update).toHaveBeenCalledWith({
        where: { variantId: "var_1" },
        data: { quantity: { decrement: 2 }, reservedQuantity: { decrement: 2 } },
      });
      expect(mockCart.clearCart).toHaveBeenCalledWith({ userId: "usr_1" });
    });
  });
});
