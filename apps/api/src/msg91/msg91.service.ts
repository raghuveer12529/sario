import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { IOtpProvider, OtpSendResult } from "./msg91.types.js";

@Injectable()
export class Msg91Service implements IOtpProvider {
  private readonly logger = new Logger(Msg91Service.name);
  private readonly authKey: string;
  private readonly templateId: string;
  private readonly senderId: string;
  private readonly isMock: boolean;

  constructor(private readonly config: ConfigService) {
    this.authKey = this.config.get("MSG91_AUTH_KEY", "");
    this.templateId = this.config.get("MSG91_TEMPLATE_ID", "");
    this.senderId = this.config.get("MSG91_SENDER_ID", "SARIO");
    this.isMock = !this.authKey || this.config.get("NODE_ENV") === "test";
  }

  async sendOtp(phone: string, otp: string): Promise<OtpSendResult> {
    if (this.isMock) {
      this.logger.warn(`[MOCK] OTP for +91${phone}: ${otp}`);
      return { success: true, messageId: `mock_${Date.now()}` };
    }

    try {
      const url = new URL("https://api.msg91.com/api/v5/otp");
      url.searchParams.set("authkey", this.authKey);
      url.searchParams.set("template_id", this.templateId);
      url.searchParams.set("mobile", `91${phone}`);
      url.searchParams.set("otp", otp);
      url.searchParams.set("sender", this.senderId);

      const res = await fetch(url.toString(), { method: "POST" });
      const body = (await res.json()) as { type?: string; message?: string };

      if (body.type === "success") {
        return {
          success: true,
          ...(body.message ? { messageId: body.message } : {}),
        };
      }

      this.logger.error(`MSG91 error for ${phone}:`, body);
      return { success: false };
    } catch (err) {
      this.logger.error(`MSG91 request failed for ${phone}:`, err);
      return { success: false };
    }
  }
}
