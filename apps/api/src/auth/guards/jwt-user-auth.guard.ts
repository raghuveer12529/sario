import { Injectable, ExecutionContext, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { JwtRole } from "../auth.types.js";

/**
 * Authenticates a customer/vendor token and REJECTS admin-realm tokens
 * (SUPER_ADMIN / SUPPORT). Admin accounts have their own login and their JWT `sub`
 * is an AdminUser id — never a User id — so letting an admin token reach buyer/vendor
 * endpoints either returns another realm's empty data or FK-crashes on writes.
 *
 * Admin endpoints must use `JwtAuthGuard + RolesGuard` with `@Roles(...)` instead.
 */
@Injectable()
export class JwtUserAuthGuard extends AuthGuard("jwt") {
  override handleRequest<TUser = { role?: JwtRole }>(err: unknown, user: TUser): TUser {
    if (err || !user) throw err ?? new UnauthorizedException();
    const role = (user as { role?: JwtRole }).role;
    if (role === "SUPER_ADMIN" || role === "SUPPORT") {
      throw new ForbiddenException("This endpoint is not available to admin accounts.");
    }
    return user;
  }

  override canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
