import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];

@Injectable()
export class UploadService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    const accountId = config.getOrThrow<string>("R2_ACCOUNT_ID");
    this.bucket = config.getOrThrow<string>("R2_BUCKET_NAME");
    this.publicUrl = config.getOrThrow<string>("R2_PUBLIC_URL");

    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.getOrThrow<string>("R2_ACCESS_KEY_ID"),
        secretAccessKey: config.getOrThrow<string>("R2_SECRET_ACCESS_KEY"),
      },
    });
  }

  isAllowedType(contentType: string): contentType is AllowedType {
    return (ALLOWED_TYPES as readonly string[]).includes(contentType);
  }

  async presign(key: string, contentType: AllowedType): Promise<{ presignedUrl: string; publicUrl: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const presignedUrl = await getSignedUrl(this.client, command, { expiresIn: 300 });
    const url = `${this.publicUrl}/${key}`;
    return { presignedUrl, publicUrl: url };
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  keyFromUrl(publicUrl: string): string {
    return publicUrl.replace(`${this.publicUrl}/`, "");
  }
}
