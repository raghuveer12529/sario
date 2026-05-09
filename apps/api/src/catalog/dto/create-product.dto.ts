import {
  IsString, IsOptional, IsArray, IsInt,
  ValidateNested, Min, MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateVariantDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() sku: string;
  @ApiPropertyOptional() @IsString() @IsOptional() color?: string;
  @ApiProperty() @IsInt() @Min(0) pricePaise: number;
  @ApiProperty() @IsInt() @Min(0) mrpPaise: number;
  @ApiPropertyOptional() @IsInt() @Min(0) @IsOptional() weightGrams?: number;
  @ApiPropertyOptional() @IsInt() @Min(0) @IsOptional() quantity?: number;
}

export class CreateProductDto {
  @ApiProperty() @IsString() @MaxLength(200) name: string;
  @ApiProperty() @IsString() @MaxLength(5000) description: string;
  @ApiProperty() @IsString() categoryId: string;
  @ApiPropertyOptional() @IsString() @IsOptional() fabric?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() region?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(3000) weaverStory?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() giTag?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() hsnCode?: string;
  @ApiPropertyOptional() @IsArray() @IsString({ each: true }) @IsOptional() tags?: string[];

  @ApiProperty({ type: [CreateVariantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];
}
