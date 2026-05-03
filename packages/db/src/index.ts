// Singleton with PrismaPg driver adapter (Prisma Postgres / pooled connections)
export { prisma } from "./lib/prisma.js";

export { PrismaClient } from "@prisma/client";
export type { Prisma } from "@prisma/client";

// Re-export enums so app code imports from @sario/db, not @prisma/client directly
export {
  VendorStatus,
  ProductStatus,
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  DiscountType,
  AdminRole,
  OtpPurpose,
} from "@prisma/client";

// Re-export model types
export type {
  User,
  Vendor,
  VendorBankAccount,
  Category,
  Product,
  ProductVariant,
  ProductImage,
  Inventory,
  Cart,
  CartItem,
  Coupon,
  Address,
  Order,
  OrderItem,
  Payment,
  Shipment,
  Refund,
  Review,
  OtpRecord,
  RefreshToken,
  AdminUser,
} from "@prisma/client";
