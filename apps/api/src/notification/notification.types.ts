export type NotificationChannel = "email" | "sms" | "whatsapp" | "push";

export type NotificationEvent =
  | "order.placed"
  | "order.confirmed"
  | "order.shipped"
  | "order.out_for_delivery"
  | "order.delivered"
  | "return.requested"
  | "refund.processed"
  | "otp.sent"
  | "payout.processed"
  | "vendor.approved";

export interface NotificationPayload {
  event: NotificationEvent;
  userId?: string;
  phone?: string;
  email?: string;
  data: Record<string, string | number>;
}
