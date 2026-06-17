import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { VendorStatus } from "@sario/db";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
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
    private readonly redis: RedisService,
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
        gstin: dto.gstin ?? null,
        pan: dto.pan ?? null,
        about: dto.about ?? null,
        returnPolicy: dto.returnPolicy ?? null,
        status: VendorStatus.PENDING,
        userId,
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
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId, deletedAt: null },
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

  async reject(vendorId: string, _reason?: string) {
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
    const updated = await this.prisma.vendor.update({
      where: { id: vendorId },
      data: { status: VendorStatus.SUSPENDED },
    });
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId }, select: { userId: true } });
    if (vendor?.userId) await this.redis.del(`jwt:user:${vendor.userId}`).catch(() => {});
    return updated;
  }

  async findOne(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId, deletedAt: null },
      include: {
        bankAccounts: true,
        user: { select: { id: true, name: true, phone: true } },
        _count: { select: { products: true } },
      },
    });
    if (!vendor) throw new NotFoundException("Vendor not found.");
    return vendor;
  }

  async resolveVendorId(userId: string): Promise<string> {
    const vendor = await this.prisma.vendor.findUnique({ where: { userId }, select: { id: true } });
    if (!vendor) throw new ForbiddenException("No vendor account found for this user.");
    return vendor.id;
  }

  private async assertVendorExists(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId, deletedAt: null },
    });
    if (!vendor) throw new NotFoundException("Vendor not found.");
    return vendor;
  }
}
