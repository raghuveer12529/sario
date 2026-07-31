import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req, Res } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { IsInt, IsString, Min } from "class-validator";
import { randomUUID } from "crypto";
import "@fastify/cookie"; // augments FastifyReply with setCookie/clearCookie
import type { FastifyReply, FastifyRequest } from "fastify";
import { CartService, type CartOwner } from "./cart.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard.js";
import { CurrentUser, type CurrentUserPayload } from "../auth/decorators/current-user.decorator.js";

const CART_COOKIE = "cart_id";

class CartItemDto {
  @IsString() variantId: string;
  @IsInt() @Min(1) quantity: number;
}

type AuthedRequest = FastifyRequest & {
  user?: CurrentUserPayload;
  cookies?: Record<string, string>;
};

@ApiTags("Cart")
@Controller({ path: "cart", version: "1" })
@UseGuards(OptionalJwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * Resolve who owns this cart. Logged-in users own a user cart. Guests get an
   * anonymous cart keyed by an httpOnly cart_id cookie, issued on first use.
   */
  private resolveOwner(req: AuthedRequest, res: FastifyReply): CartOwner {
    // Only real customers/vendors own a user cart. An admin token resolves via the shared
    // JWT strategy but its `sub` is an AdminUser id, not a User id — treating it as a cart
    // owner would violate Cart_userId_fkey. Fall through to a harmless guest cart instead.
    const role = req.user?.role;
    if (req.user?.id && role !== "SUPER_ADMIN" && role !== "SUPPORT") {
      return { userId: req.user.id };
    }

    let anonymousId = req.cookies?.[CART_COOKIE];
    if (!anonymousId) {
      anonymousId = randomUUID();
      const isProd = process.env["NODE_ENV"] === "production";
      void res.setCookie(CART_COOKIE, anonymousId, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
    }
    return { anonymousId };
  }

  @Get()
  @ApiOperation({ summary: "Get current cart (user or guest)" })
  getCart(@Req() req: AuthedRequest, @Res({ passthrough: true }) res: FastifyReply) {
    return this.cartService.getCart(this.resolveOwner(req, res));
  }

  @Post("items")
  @ApiOperation({ summary: "Add item to cart" })
  addItem(
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: FastifyReply,
    @Body() dto: CartItemDto,
  ) {
    return this.cartService.addItem(this.resolveOwner(req, res), dto.variantId, dto.quantity);
  }

  @Patch("items/:variantId")
  @ApiOperation({ summary: "Update item quantity" })
  updateItem(
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: FastifyReply,
    @Param("variantId") variantId: string,
    @Body("quantity") quantity: number,
  ) {
    return this.cartService.updateItem(this.resolveOwner(req, res), variantId, quantity);
  }

  @Delete("items/:variantId")
  @ApiOperation({ summary: "Remove item from cart" })
  removeItem(
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: FastifyReply,
    @Param("variantId") variantId: string,
  ) {
    return this.cartService.removeItem(this.resolveOwner(req, res), variantId);
  }

  @Post("merge")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Merge the guest cart into the user cart after login" })
  async merge(
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const anonymousId = req.cookies?.[CART_COOKIE];
    if (!anonymousId) return this.cartService.getCart({ userId: user.id });

    const cart = await this.cartService.mergeAnonymousCart(anonymousId, user.id);
    void res.clearCookie(CART_COOKIE, { path: "/" });
    return cart;
  }
}
