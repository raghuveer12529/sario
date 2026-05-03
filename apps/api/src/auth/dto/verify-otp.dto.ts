import { IsEnum, Matches, Length } from "class-validator";
import { OtpPurpose } from "@sario/db";
import { ApiProperty } from "@nestjs/swagger";

export class VerifyOtpDto {
  @ApiProperty({ example: "9876543210" })
  @Matches(/^[6-9]\d{9}$/, { message: "Enter a valid 10-digit Indian mobile number" })
  phone: string;

  @ApiProperty({ example: "123456" })
  @Length(6, 6, { message: "OTP must be 6 digits" })
  @Matches(/^\d{6}$/, { message: "OTP must be 6 digits" })
  otp: string;

  @ApiProperty({ enum: OtpPurpose, default: OtpPurpose.LOGIN })
  @IsEnum(OtpPurpose)
  purpose: OtpPurpose = OtpPurpose.LOGIN;
}
