export const APP_NAME = "Sario";
export const DEFAULT_CURRENCY = "INR";
export const DEFAULT_LOCALE = "en-IN";
export const DEFAULT_TIMEZONE = "Asia/Kolkata";

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const ORDER_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  PACKED: "PACKED",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  RETURN_REQUESTED: "RETURN_REQUESTED",
  RETURN_APPROVED: "RETURN_APPROVED",
  RETURN_REJECTED: "RETURN_REJECTED",
  REFUNDED: "REFUNDED",
} as const;

export const VENDOR_STATUS = {
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  SUSPENDED: "SUSPENDED",
} as const;

export const PRODUCT_STATUS = {
  DRAFT: "DRAFT",
  PENDING_REVIEW: "PENDING_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  ARCHIVED: "ARCHIVED",
} as const;

export const PAYMENT_STATUS = {
  CREATED: "CREATED",
  AUTHORIZED: "AUTHORIZED",
  CAPTURED: "CAPTURED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
} as const;

export const GST_RATES = {
  SAREE_COTTON_HANDLOOM: 5,
  SAREE_SYNTHETIC: 12,
  SAREE_SILK: 5,
  ACCESSORIES: 18,
} as const;

// Catalogue prices are GST-inclusive ("inclusive of all taxes"). Handloom/silk sarees —
// the dominant category — are 5%. Used to surface the embedded tax for invoices.
export const DEFAULT_GST_RATE = 5;

/** Extract the GST component already embedded in a tax-inclusive amount (paise). */
export function extractInclusiveGstPaise(inclusivePaise: number, ratePercent: number = DEFAULT_GST_RATE): number {
  if (inclusivePaise <= 0) return 0;
  return Math.round(inclusivePaise - inclusivePaise / (1 + ratePercent / 100));
}

export const SETTLEMENT_DAYS = 7;
export const RETURN_WINDOW_DAYS = 7;
export const COD_MAX_VALUE_PAISE = 500000; // ₹5,000
export const OTP_TTL_SECONDS = 300; // 5 min
export const OTP_MAX_ATTEMPTS_PER_HOUR = 3;
export const ACCESS_TOKEN_TTL = "15m";
export const REFRESH_TOKEN_TTL_DAYS = 30;

export const CART_LOCK_TTL_SECONDS = 600; // 10 min
export const RECONCILIATION_INTERVAL_MS = 5 * 60 * 1000; // 5 min
