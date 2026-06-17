import { Test, type TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { PayoutStatus } from "@sario/db";
import { PayoutService } from "./payout.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RazorpayService } from "../payment/razorpay.service.js";

const mockPrisma = {
  payout: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  vendor: {
    findUnique: jest.fn(),
  },
};

const mockRazorpay = {
  createTransfer: jest.fn(),
};

const mockConfig = {
  get: jest.fn((_key: string, def?: number) => def),
};

function order(overrides: Record<string, unknown> = {}) {
  return { id: "ord_1", vendorId: "ven_1", totalPaise: 100000, ...overrides };
}

describe("PayoutService", () => {
  let service: PayoutService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.payout.findUnique.mockResolvedValue(null);
    mockPrisma.payout.create.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RazorpayService, useValue: mockRazorpay },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(PayoutService);
  });

  it("computes commission and net, transferring the net amount to the vendor", async () => {
    mockPrisma.vendor.findUnique.mockResolvedValue({
      id: "ven_1",
      commissionBps: 1500,
      razorpayAccountId: "acc_x",
    });
    mockRazorpay.createTransfer.mockResolvedValue({ id: "trf_x" });

    await service.createPayoutsForGroup("pay_rz", [order()], "pmt_1");

    expect(mockRazorpay.createTransfer).toHaveBeenCalledWith("pay_rz", "acc_x", 85000);
    expect(mockPrisma.payout.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: "ord_1",
          vendorId: "ven_1",
          paymentId: "pmt_1",
          grossPaise: 100000,
          commissionPaise: 15000,
          netPaise: 85000,
        }) as unknown,
      }),
    );
  });

  it("is idempotent: skips orders that already have a payout", async () => {
    mockPrisma.payout.findUnique.mockResolvedValue({ id: "po_existing", orderId: "ord_1" });

    await service.createPayoutsForGroup("pay_rz", [order()], "pmt_1");

    expect(mockPrisma.vendor.findUnique).not.toHaveBeenCalled();
    expect(mockRazorpay.createTransfer).not.toHaveBeenCalled();
    expect(mockPrisma.payout.create).not.toHaveBeenCalled();
  });

  it("records a FAILED payout without transferring when vendor has no linked account", async () => {
    mockPrisma.vendor.findUnique.mockResolvedValue({
      id: "ven_1",
      commissionBps: 1500,
      razorpayAccountId: null,
    });

    await expect(
      service.createPayoutsForGroup("pay_rz", [order()], "pmt_1"),
    ).resolves.toBeUndefined();

    expect(mockRazorpay.createTransfer).not.toHaveBeenCalled();
    expect(mockPrisma.payout.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: "ord_1",
          status: PayoutStatus.FAILED,
          failureReason: expect.any(String) as string,
        }) as unknown,
      }),
    );
  });

  it("records a PROCESSED payout with the transfer id on success", async () => {
    mockPrisma.vendor.findUnique.mockResolvedValue({
      id: "ven_1",
      commissionBps: 1500,
      razorpayAccountId: "acc_x",
    });
    mockRazorpay.createTransfer.mockResolvedValue({ id: "trf_x" });

    await service.createPayoutsForGroup("pay_rz", [order()], "pmt_1");

    expect(mockPrisma.payout.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          razorpayTransferId: "trf_x",
          status: PayoutStatus.PROCESSED,
          processedAt: expect.any(Date) as Date,
        }) as unknown,
      }),
    );
  });

  it("iterates the group, transferring per-order amounts for each distinct vendor", async () => {
    mockPrisma.vendor.findUnique.mockImplementation(
      ({ where }: { where: { id: string } }) =>
        Promise.resolve({
          id: where.id,
          commissionBps: 1500,
          razorpayAccountId: where.id === "ven_1" ? "acc_1" : "acc_2",
        }),
    );
    mockRazorpay.createTransfer.mockResolvedValue({ id: "trf_x" });

    await service.createPayoutsForGroup(
      "pay_rz",
      [
        order({ id: "ord_1", vendorId: "ven_1", totalPaise: 100000 }),
        order({ id: "ord_2", vendorId: "ven_2", totalPaise: 200000 }),
      ],
      "pmt_1",
    );

    expect(mockRazorpay.createTransfer).toHaveBeenCalledTimes(2);
    expect(mockRazorpay.createTransfer).toHaveBeenCalledWith("pay_rz", "acc_1", 85000);
    expect(mockRazorpay.createTransfer).toHaveBeenCalledWith("pay_rz", "acc_2", 170000);

    expect(mockPrisma.payout.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.payout.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orderId: "ord_1", vendorId: "ven_1", netPaise: 85000 }) as unknown,
      }),
    );
    expect(mockPrisma.payout.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orderId: "ord_2", vendorId: "ven_2", netPaise: 170000 }) as unknown,
      }),
    );
  });

  it("records FAILED and does not throw when the transfer call fails", async () => {
    mockPrisma.vendor.findUnique.mockResolvedValue({
      id: "ven_1",
      commissionBps: 1500,
      razorpayAccountId: "acc_x",
    });
    mockRazorpay.createTransfer.mockRejectedValue(new Error("Razorpay down"));

    await expect(
      service.createPayoutsForGroup("pay_rz", [order()], "pmt_1"),
    ).resolves.toBeUndefined();

    expect(mockPrisma.payout.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PayoutStatus.FAILED,
          failureReason: "Razorpay down",
        }) as unknown,
      }),
    );
  });
});
