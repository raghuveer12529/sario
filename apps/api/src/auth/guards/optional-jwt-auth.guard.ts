import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Like JwtAuthGuard, but never rejects: if a valid token is present, req.user is set;
 * otherwise the request proceeds anonymously (req.user === undefined).
 * Used by endpoints that work for both guests and logged-in users (e.g. cart).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  override handleRequest<TUser = unknown>(_err: unknown, user: TUser): TUser {
    return user ?? (undefined as TUser);
  }

  override canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
