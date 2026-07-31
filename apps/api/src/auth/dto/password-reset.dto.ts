import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength, MaxLength, Matches } from "class-validator";

export class ForgotPasswordDto {
  @ApiProperty({ example: "buyer@example.com" })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: "The token from the password-reset email link." })
  @IsString()
  @MinLength(1)
  token!: string;

  @ApiProperty({ example: "MyN3wP@ssword", description: "Min 8 chars, at least one letter and one number." })
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters." })
  @MaxLength(72, { message: "Password must be at most 72 characters." })
  @Matches(/[A-Za-z]/, { message: "Password must contain a letter." })
  @Matches(/\d/, { message: "Password must contain a number." })
  password!: string;
}

export class VerifyEmailDto {
  @ApiProperty({ description: "The token from the verification email link." })
  @IsString()
  @MinLength(1)
  token!: string;
}
