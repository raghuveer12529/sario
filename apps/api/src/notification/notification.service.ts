import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { NotificationPayload, NotificationEvent } from "./notification.types.js";

const TEMPLATES: Record<NotificationEvent, { sms: string; subject?: string; email?: string }> = {
  "order.placed": {
    sms: "Your Sario order #{orderId} for ₹{amount} has been placed. Track it on the app.",
    subject: "Order Confirmed — #{orderId}",
    email: "Thank you for your order! Your order #{orderId} has been placed successfully.",
  },
  "order.confirmed": {
    sms: "Order #{orderId} confirmed by the vendor. We'll notify you when it ships.",
  },
  "order.shipped": {
    sms: "Order #{orderId} shipped via {courier}. Track: {trackingUrl}",
    subject: "Your order is on its way!",
  },
  "order.out_for_delivery": {
    sms: "Your Sario order #{orderId} is out for delivery today!",
  },
  "order.delivered": {
    sms: "Order #{orderId} delivered. Share your experience — leave a review!",
    subject: "How was your purchase?",
  },
  "return.requested": {
    sms: "Return request for order #{orderId} received. We'll process it within 48 hours.",
  },
  "refund.processed": {
    sms: "₹{amount} refunded for order #{orderId}. It'll reflect in 5-7 business days.",
    subject: "Refund processed for #{orderId}",
  },
  "otp.sent": {
    sms: "{otp} is your Sario OTP. Valid for 5 minutes. Do not share.",
  },
  "payout.processed": {
    sms: "₹{amount} credited to your bank account for orders settled on {date}.",
    subject: "Payout processed",
  },
  "vendor.approved": {
    sms: "Your Sario vendor account has been approved! Start listing products.",
    subject: "Welcome to Sario — Your vendor account is live",
  },
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly msg91Key: string;
  private readonly resendKey: string;

  constructor(private readonly config: ConfigService) {
    this.msg91Key = this.config.get("MSG91_AUTH_KEY", "");
    this.resendKey = this.config.get("RESEND_API_KEY", "");
  }

  async send(payload: NotificationPayload): Promise<void> {
    const template = TEMPLATES[payload.event];
    if (!template) {
      this.logger.warn(`No template for event ${payload.event}`);
      return;
    }

    const rendered = this.render(template.sms, payload.data);

    const tasks: Promise<void>[] = [];

    if (payload.phone) {
      tasks.push(this.sendSms(payload.phone, rendered));
    }

    if (payload.email && template.subject && template.email) {
      tasks.push(
        this.sendEmail(
          payload.email,
          template.subject,
          this.render(template.email, payload.data),
        ),
      );
    }

    await Promise.allSettled(tasks);
  }

  private async sendSms(phone: string, message: string): Promise<void> {
    if (!this.msg91Key) {
      this.logger.log(`[MOCK SMS] +91${phone}: ${message}`);
      return;
    }
    try {
      await fetch("https://api.msg91.com/api/sendhttp.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          authkey: this.msg91Key,
          mobiles: `91${phone}`,
          message,
          sender: "SARIO",
          route: "4",
        }),
      });
    } catch (err) {
      this.logger.error(`SMS failed for ${phone}:`, err);
    }
  }

  private async sendEmail(to: string, subject: string, body: string): Promise<void> {
    if (!this.resendKey) {
      this.logger.log(`[MOCK EMAIL] to=${to} subject="${subject}"`);
      return;
    }
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.resendKey}`,
        },
        body: JSON.stringify({
          from: "Sario <noreply@sario.in>",
          to,
          subject,
          text: body,
        }),
      });
    } catch (err) {
      this.logger.error(`Email failed for ${to}:`, err);
    }
  }

  private render(template: string, data: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (_, key: string) => String(data[key] ?? `{${key}}`));
  }
}
