import type {
  ORDER_STATUS,
  VENDOR_STATUS,
  PRODUCT_STATUS,
  PAYMENT_STATUS,
} from "../constants.js";

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
export type VendorStatus = (typeof VENDOR_STATUS)[keyof typeof VENDOR_STATUS];
export type ProductStatus = (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface MoneyAmount {
  amountPaise: number;
  currency: "INR";
}

export interface Address {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: "IN";
}
