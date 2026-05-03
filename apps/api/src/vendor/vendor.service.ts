import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { VendorStatus } from "@sario/db";
import { PrismaService } from "../prisma/prisma.service.js";
import { PennyDropService } from "./penny-drop.service.js";
import type { ApplyVendorDto } from "./dto/apply-vendor.dto.js";
import type { UpdateVendorDto } from "./dto/update-vendor.dto.js";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

@Injectable()
export class VendorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pennyDrop: PennyDropService,
  ) {}

  async apply(userId: string, dto: ApplyVendorDto) {
    const existing = await this.prisma.vendor.findFirst({
      where: { slug: slugify(dto.businessName), deletedAt: null },
    });
    if (existing) throw new ConflictException("A vendor with this business name already exists.");

    const pennyResult = await this.pennyDrop.verify(dto.accountNumber, dto.ifsc);

    const baseSlug = slugify(dto.businessName);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    return this.prisma.vendor.create({
      data: {
        businessName: dto.businessName,
        slug,
        gstin: dto.gstin,
        pan: dto.pan,
        about: dto.about,
        returnPolicy: dto.returnPolicy,
        status: VendorStatus.PENDING,
        bankAccounts: {
          create: {
            accountHolder: dto.accountHolder,
            accountNumber: dto.accountNumber,
            ifsc: dto.ifsc,
            bankName: dto.bankName,
            isPrimary: true,
            isPennyDropDone: true,
            isVerified: pennyResult.verified,
          },
        },
      },
      include: { bankAccounts: true },
    });
  }

  async getMyVendor(userId: string) {
    // In this simple model a user can have one vendor profile.
    // We identify it via the vendor linked to the user's orders / future userId column.
    // For now, look up by the passed-in userId stored externally.
    const vendor = await this.prisma.vendor.findFirst({
      where: { deletedAt: null },
      include: { bankAccounts: { select: { id: true, bankName: true, isPrimary: true, isVerified: true } } },
    });
    if (!vendor) throw new NotFoundException("Vendor profile not found.");
    return vendor;
  }

  async update(vendorId: string, dto: UpdateVendorDto) {
    await this.assertVendorExists(vendorId);
    return this.prisma.vendor.update({
      where: { id: vendorId },
      data: dto,
    });
  }

  // ─── Admin operations ──────────────────────────────────────────────────────

  async listPending(status?: VendorStatus) {
    return this.prisma.vendor.findMany({
      where: { status: status ?? VendorStatus.PENDING, deletedAt: null },
      include: { bankAccounts: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async approve(vendorId: string) {
    const vendor = await this.assertVendorExists(vendorId);
    if (vendor.status !== VendorStatus.PENDING) {
      throw new BadRequestException("Only PENDING vendors can be approved.");
    }
    return this.prisma.vendor.update({
      where: { id: vendorId },
      data: { status: VendorStatus.APPROVED },
    });
  }

  async reject(vendorId: string, reason?: string) {
    const vendor = await this.assertVendorExists(vendorId);
    if (vendor.status !== VendorStatus.PENDING) {
      throw new BadRequestException("Only PENDING vendors can be rejected.");
    }
    return this.prisma.vendor.update({
      where: { id: vendorId },
      data: { status: VendorStatus.DRAFT },
    });
  }

  async suspend(vendorId: string) {
    await this.assertVendorExists(vendorId);
    return this.prisma.vendor.update({
      where: { id: vendorId },
      data: { status: VendorStatus.SUSPENDED },
    });
  }

  private async assertVendorExists(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId, deletedAt: null },
    });
    if (!vendor) throw new NotFoundException("Vendor not found.");
    return vendor;
  }
}
