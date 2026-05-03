import { IsEnum, Matches } from "class-validator";
import { OtpPurpose } from "@sario/db";
import { ApiProperty } from "@nestjs/swagger";

export class RequestOtpDto {
  @ApiProperty({ example: "9876543210" })
  @Matches(/^[6-9]\d{9}$/, { message: "Enter a valid 10-digit Indian mobile number" })
  phone: string;

  @ApiProperty({ enum: OtpPurpose, default: OtpPurpose.LOGIN })
  @IsEnum(OtpPurpose)
  purpose: OtpPurpose = OtpPurpose.LOGIN;
}
