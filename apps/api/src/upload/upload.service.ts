import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "crypto";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];

@Injectable()
export class UploadService {
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(private readonly config: ConfigService) {
    this.cloudName = config.getOrThrow<string>("CLOUDINARY_CLOUD_NAME");
    this.apiKey = config.getOrThrow<string>("CLOUDINARY_API_KEY");
    this.apiSecret = config.getOrThrow<string>("CLOUDINARY_API_SECRET");
  }

  get publicUrlBase(): string {
    return `https://res.cloudinary.com/${this.cloudName}/image/upload`;
  }

  isAllowedType(contentType: string): contentType is AllowedType {
    return (ALLOWED_TYPES as readonly string[]).includes(contentType);
  }

  presign(folder: string): {
    uploadUrl: string;
    apiKey: string;
    timestamp: number;
    signature: string;
    folder: string;
  } {
    const timestamp = Math.round(Date.now() / 1000);
    const signature = this.sign({ folder, timestamp: String(timestamp) });
    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      apiKey: this.apiKey,
      timestamp,
      signature,
      folder,
    };
  }

  async deleteObject(publicId: string): Promise<void> {
    const timestamp = Math.round(Date.now() / 1000);
    const signature = this.sign({ public_id: publicId, timestamp: String(timestamp) });
    const body = new URLSearchParams({
      public_id: publicId,
      api_key: this.apiKey,
      timestamp: String(timestamp),
      signature,
      invalidate: "true",
    });
    await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  }

  keyFromUrl(url: string): string {
    // Extract public_id from Cloudinary URL for deletion
    // Format: https://res.cloudinary.com/{cloud}/image/upload/v{ver}/{public_id}.{ext}
    const withoutBase = url.replace(`${this.publicUrlBase}/`, "");
    const withoutVersion = withoutBase.replace(/^v\d+\//, "");
    return withoutVersion.replace(/\.[^.]+$/, "");
  }

  private sign(params: Record<string, string>): string {
    const str =
      Object.keys(params)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join("&") + this.apiSecret;
    return createHash("sha1").update(str).digest("hex");
  }
}
