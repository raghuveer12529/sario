import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, IsUrl, MinLength } from "class-validator";

export class UpdateProfileDto {
  @ApiProperty({ example: "Raghuveer Talari", required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiProperty({ example: "raghu@example.com", required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: "https://example.com/avatar.jpg", required: false })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
