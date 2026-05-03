import { IsString, IsOptional, Matches, MinLength, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ApplyVendorDto {
  @ApiProperty({ example: "Kanjivaram Silks" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  businessName: string;

  @ApiPropertyOptional({ example: "33AABCU9603R1ZV" })
  @IsOptional()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: "Invalid GSTIN format",
  })
  gstin?: string;

  @ApiPropertyOptional({ example: "ABCDE1234F" })
  @IsOptional()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, { message: "Invalid PAN format" })
  pan?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  about?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  returnPolicy?: string;

  // Bank account
  @ApiProperty({ example: "Kanjivaram Silks Pvt Ltd" })
  @IsString()
  @MinLength(2)
  accountHolder: string;

  @ApiProperty({ example: "1234567890" })
  @IsString()
  @Matches(/^\d{9,18}$/, { message: "Invalid account number" })
  accountNumber: string;

  @ApiProperty({ example: "SBIN0001234" })
  @IsString()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: "Invalid IFSC code" })
  ifsc: string;

  @ApiProperty({ example: "State Bank of India" })
  @IsString()
  @MinLength(2)
  bankName: string;
}
