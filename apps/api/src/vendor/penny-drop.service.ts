import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface PennyDropResult {
  verified: boolean;
  nameAtBank?: string;
  reason?: string;
}

export interface IPennyDropProvider {
  verify(accountNumber: string, ifsc: string): Promise<PennyDropResult>;
}

@Injectable()
export class PennyDropService implements IPennyDropProvider {
  private readonly logger = new Logger(PennyDropService.name);
  private readonly isMock: boolean;

  constructor(private readonly config: ConfigService) {
    // Use real Karza/Surepass when PENNY_DROP_API_KEY is set
    this.isMock = !this.config.get("PENNY_DROP_API_KEY");
  }

  verify(accountNumber: string, _ifsc: string): Promise<PennyDropResult> {
    if (this.isMock) {
      this.logger.warn(`[MOCK] Penny drop for account ending ${accountNumber.slice(-4)}`);
      return Promise.resolve({ verified: true, nameAtBank: "Mock Account Holder" });
    }

    // TODO: integrate Karza or Surepass real API
    this.logger.warn("Real penny-drop not implemented yet — add PENNY_DROP_API_KEY logic");
    return Promise.resolve({ verified: false, reason: "Provider not configured" });
  }
}
