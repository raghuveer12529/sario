import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Version } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { IsInt, IsString, Min } from "class-validator";
import { CartService } from "./cart.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CurrentUser, type CurrentUserPayload } from "../auth/decorators/current-user.decorator.js";

class CartItemDto {
  @IsString() variantId: string;
  @IsInt() @Min(1) quantity: number;
}

@ApiTags("Cart")
@Controller("cart")
@Version("1")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: "Get current cart" })
  getCart(@CurrentUser() user: CurrentUserPayload) {
    return this.cartService.getCart(user.id);
  }

  @Post("items")
  @ApiOperation({ summary: "Add item to cart" })
  addItem(@CurrentUser() user: CurrentUserPayload, @Body() dto: CartItemDto) {
    return this.cartService.addItem(user.id, dto.variantId, dto.quantity);
  }

  @Patch("items/:variantId")
  @ApiOperation({ summary: "Update item quantity" })
  updateItem(
    @CurrentUser() user: CurrentUserPayload,
    @Param("variantId") variantId: string,
    @Body("quantity") quantity: number,
  ) {
    return this.cartService.updateItem(user.id, variantId, quantity);
  }

  @Delete("items/:variantId")
  @ApiOperation({ summary: "Remove item from cart" })
  removeItem(@CurrentUser() user: CurrentUserPayload, @Param("variantId") variantId: string) {
    return this.cartService.removeItem(user.id, variantId);
  }
}
