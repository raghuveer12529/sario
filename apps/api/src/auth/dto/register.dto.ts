import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength, MaxLength, Matches } from "class-validator";

export class RegisterDto {
  @ApiProperty({ example: "buyer@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "MyP@ssword1", description: "Min 8 chars, at least one letter and one number." })
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters." })
  @MaxLength(72, { message: "Password must be at most 72 characters." })
  @Matches(/[A-Za-z]/, { message: "Password must contain a letter." })
  @Matches(/\d/, { message: "Password must contain a number." })
  password!: string;
}
