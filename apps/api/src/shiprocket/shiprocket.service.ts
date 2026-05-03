import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface ShiprocketOrder {
  shipment_id: string;
  awb_code: string;
  courier_name: string;
  tracking_url: string;
}

@Injectable()
export class ShiprocketService {
  private readonly logger = new Logger(ShiprocketService.name);
  private readonly baseUrl = "https://apiv2.shiprocket.in/v1/external";
  private token: string | null = null;
  private tokenExpiry = 0;
  private readonly isMock: boolean;

  constructor(private readonly config: ConfigService) {
    this.isMock = !this.config.get("SHIPROCKET_EMAIL");
  }

  async createShipment(payload: {
    orderId: string;
    orderDate: string;
    pickupLocation: string;
    items: Array<{ name: string; sku: string; units: number; sellingPrice: number }>;
    deliveryAddress: {
      name: string; phone: string; address: string; city: string; state: string; pincode: string;
    };
    weightKg: number;
  }): Promise<ShiprocketOrder> {
    if (this.isMock) {
      this.logger.warn(`[MOCK] Shiprocket shipment for order ${payload.orderId}`);
      return {
        shipment_id: `mock_ship_${Date.now()}`,
        awb_code: `MOCK${Date.now()}`,
        courier_name: "Mock Express",
        tracking_url: `https://tracking.example.com/mock`,
      };
    }

    const token = await this.getToken();
    const res = await fetch(`${this.baseUrl}/orders/create/adhoc`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return res.json() as Promise<ShiprocketOrder>;
  }

  async getTracking(awbCode: string) {
    if (this.isMock) {
      return { current_status: "IN_TRANSIT", etd: new Date(Date.now() + 3 * 86400000).toISOString() };
    }
    const token = await this.getToken();
    const res = await fetch(`${this.baseUrl}/courier/track/awb/${awbCode}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  }

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiry) return this.token;

    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: this.config.get("SHIPROCKET_EMAIL"),
        password: this.config.get("SHIPROCKET_PASSWORD"),
      }),
    });
    const data = (await res.json()) as { token: string };
    this.token = data.token;
    this.tokenExpiry = Date.now() + 9 * 24 * 3600 * 1000; // token valid ~10 days
    return this.token;
  }
}
