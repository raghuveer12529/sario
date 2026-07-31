import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { RefundStatus, PaymentStatus } from "@sario/db";
import { ReturnsService } from "./returns.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RazorpayService } from "../payment/razorpay.service.js";
import { VendorService } from "../vendor/vendor.service.js";

const mockPrisma = {
  order: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  refund: {
    findFirst: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn(),
  },
  payment: {
    findFirst: jest.fn(),
  },
  inventory: {
    update: jest.fn(),
  },
};

const mockRazorpay = {
  createRefund: jest.fn(),
};

const mockVendor = {
  resolveVendorId: jest.fn(),
};

function buildOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "ord_1",
    userId: "usr_1",
    checkoutGroupId: "grp_1",
    totalPaise: 105000,
    items: [
      { variantId: "var_1", quantity: 2 },
      { variantId: "var_2", quantity: 1 },
    ],
    ...overrides,
  };
}

describe("ReturnsService", () => {
  let service: ReturnsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReturnsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RazorpayService, useValue: mockRazorpay },
        { provide: VendorService, useValue: mockVendor },
      ],
    }).compile();

    service = module.get<ReturnsService>(ReturnsService);
  });

  // ─── issueRefund ──────────────────────────────────────────────────────────

  describe("issueRefund", () => {
    it("returns the existing refund and does NOT call Razorpay when an active refund exists", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(buildOrder());
      const existing = { id: "ref_existing", status: RefundStatus.PROCESSED };
      mockPrisma.refund.findFirst.mockResolvedValue(existing);

      const result = await service.issueRefund("ord_1", undefined, "dup");

      expect(result).toBe(existing);
      expect(mockRazorpay.createRefund).not.toHaveBeenCalled();
      expect(mockPrisma.refund.create).not.toHaveBeenCalled();
    });

    it("caps the refund at the payment's remaining refundable balance", async () => {
      // Order total 105000, but the payment only has 20000 left after prior refunds.
      mockPrisma.order.findUnique.mockResolvedValue(buildOrder({ totalPaise: 105000 }));
      mockPrisma.refund.findFirst.mockResolvedValue(null);
      mockPrisma.payment.findFirst.mockResolvedValue({
        id: "pay_1",
        amountPaise: 105000,
        razorpayPaymentId: "rz_pay_1",
        status: PaymentStatus.CAPTURED,
      });
      mockPrisma.refund.aggregate.mockResolvedValue({ _sum: { amountPaise: 85000 } });
      mockRazorpay.createRefund.mockResolvedValue({ id: "rz_ref_1" });
      mockPrisma.refund.create.mockResolvedValue({ id: "ref_new" });
      mockPrisma.inventory.update.mockResolvedValue({});

      // Request more than is left; expect the capped amount (105000 - 85000 = 20000).
      await service.issueRefund("ord_1", 999999, "partial");

      expect(mockRazorpay.createRefund).toHaveBeenCalledWith("rz_pay_1", 20000);
    });

    it("throws BadRequestException when no captured payment is found", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(buildOrder());
      mockPrisma.refund.findFirst.mockResolvedValue(null);
      // No own payment, and no group payment.
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      mockPrisma.order.findMany.mockResolvedValue([{ id: "ord_1" }]);

      await expect(service.issueRefund("ord_1", undefined, "x")).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRazorpay.createRefund).not.toHaveBeenCalled();
    });

    it("restocks every order item once after a successful refund", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(buildOrder());
      mockPrisma.refund.findFirst.mockResolvedValue(null);
      mockPrisma.payment.findFirst.mockResolvedValue({
        id: "pay_1",
        amountPaise: 200000,
        razorpayPaymentId: "rz_pay_1",
        status: PaymentStatus.CAPTURED,
      });
      mockPrisma.refund.aggregate.mockResolvedValue({ _sum: { amountPaise: 0 } });
      mockRazorpay.createRefund.mockResolvedValue({ id: "rz_ref_1" });
      mockPrisma.refund.create.mockResolvedValue({ id: "ref_new" });
      mockPrisma.inventory.update.mockResolvedValue({});

      await service.issueRefund("ord_1", undefined, "full");

      expect(mockPrisma.inventory.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.inventory.update).toHaveBeenCalledWith({
        where: { variantId: "var_1" },
        data: { quantity: { increment: 2 } },
      });
      expect(mockPrisma.inventory.update).toHaveBeenCalledWith({
        where: { variantId: "var_2" },
        data: { quantity: { increment: 1 } },
      });
    });
  });
});
