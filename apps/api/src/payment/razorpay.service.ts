import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac } from "crypto";

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
}

export interface RazorpayRefund {
  id: string;
  payment_id: string;
  amount: number;
  status: string;
}

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;
  private readonly baseUrl = "https://api.razorpay.com/v1";

  constructor(private readonly config: ConfigService) {
    this.keyId = this.config.get("RAZORPAY_KEY_ID", "");
    this.keySecret = this.config.get("RAZORPAY_KEY_SECRET", "");
    this.webhookSecret = this.config.get("RAZORPAY_WEBHOOK_SECRET", "");
  }

  async createOrder(amountPaise: number, receipt: string): Promise<RazorpayOrder> {
    if (!this.keyId) {
      this.logger.warn("[MOCK] Creating Razorpay order");
      return { id: `mock_order_${Date.now()}`, amount: amountPaise, currency: "INR", receipt };
    }

    const res = await this.request<RazorpayOrder>("POST", "/orders", {
      amount: amountPaise,
      currency: "INR",
      receipt,
    });
    return res;
  }

  async createRefund(paymentId: string, amountPaise: number): Promise<RazorpayRefund> {
    if (!this.keyId) {
      this.logger.warn(`[MOCK] Refund for payment ${paymentId}`);
      return { id: `mock_refund_${Date.now()}`, payment_id: paymentId, amount: amountPaise, status: "processed" };
    }
    return this.request<RazorpayRefund>("POST", `/payments/${paymentId}/refund`, {
      amount: amountPaise,
    });
  }

  async fetchPayment(paymentId: string) {
    if (!this.keyId) return { status: "captured", amount: 0 };
    return this.request<{ status: string; amount: number }>("GET", `/payments/${paymentId}`);
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    const expected = createHmac("sha256", this.webhookSecret).update(body).digest("hex");
    return expected === signature;
  }

  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    if (!this.keyId) return true; // Always true in mock mode
    const expected = createHmac("sha256", this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    return expected === signature;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const credentials = Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");
    const init: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    };
    const res = await fetch(`${this.baseUrl}${path}`, init);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Razorpay ${method} ${path} → ${res.status}: ${err}`);
    }
    return res.json() as Promise<T>;
  }
}
