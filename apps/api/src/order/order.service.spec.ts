import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { OrderStatus } from "@sario/db";
import { OrderService } from "./order.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { ShiprocketService } from "../shiprocket/shiprocket.service.js";
import { VendorService } from "../vendor/vendor.service.js";
import { ReturnsService } from "../returns/returns.service.js";

const mockPrisma = {
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockShiprocket = {
  createShipment: jest.fn(),
};

const mockVendor = {
  resolveVendorId: jest.fn(),
};

const mockReturns = {
  issueRefund: jest.fn(),
};

describe("OrderService", () => {
  let service: OrderService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ShiprocketService, useValue: mockShiprocket },
        { provide: VendorService, useValue: mockVendor },
        { provide: ReturnsService, useValue: mockReturns },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  // ─── advanceOrderStatus ─────────────────────────────────────────────────────

  describe("advanceOrderStatus", () => {
    it("advances CONFIRMED → PACKED and stamps packedAt", async () => {
      mockVendor.resolveVendorId.mockResolvedValue("ven_1");
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "ord_1",
        vendorId: "ven_1",
        status: OrderStatus.CONFIRMED,
      });
      mockPrisma.order.update.mockResolvedValue({});

      await service.advanceOrderStatus("usr_1", "ord_1");

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: "ord_1" },
        data: { status: OrderStatus.PACKED, packedAt: expect.any(Date) as Date },
      });
    });

    it("advances PACKED → SHIPPED and stamps shippedAt", async () => {
      mockVendor.resolveVendorId.mockResolvedValue("ven_1");
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "ord_1",
        vendorId: "ven_1",
        status: OrderStatus.PACKED,
      });
      mockPrisma.order.update.mockResolvedValue({});

      await service.advanceOrderStatus("usr_1", "ord_1");

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: "ord_1" },
        data: { status: OrderStatus.SHIPPED, shippedAt: expect.any(Date) as Date },
      });
    });

    it("throws BadRequestException for a status with no defined transition", async () => {
      mockVendor.resolveVendorId.mockResolvedValue("ven_1");
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "ord_1",
        vendorId: "ven_1",
        status: OrderStatus.DELIVERED,
      });

      await expect(service.advanceOrderStatus("usr_1", "ord_1")).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it("throws ForbiddenException when the order belongs to another vendor", async () => {
      mockVendor.resolveVendorId.mockResolvedValue("ven_other");
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "ord_1",
        vendorId: "ven_1",
        status: OrderStatus.CONFIRMED,
      });

      await expect(service.advanceOrderStatus("usr_1", "ord_1")).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });
  });

  // ─── requestReturn ──────────────────────────────────────────────────────────

  describe("requestReturn", () => {
    it("throws BadRequestException when the order is not DELIVERED", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "ord_1",
        userId: "usr_1",
        status: OrderStatus.SHIPPED,
        deliveredAt: null,
      });

      await expect(service.requestReturn("usr_1", "ord_1", "damaged")).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it("throws BadRequestException when the 7-day return window has passed", async () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 3600 * 1000);
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "ord_1",
        userId: "usr_1",
        status: OrderStatus.DELIVERED,
        deliveredAt: eightDaysAgo,
      });

      await expect(service.requestReturn("usr_1", "ord_1", "changed mind")).rejects.toThrow(
        /Return window/,
      );
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });
  });
});
