import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";
import { ROLES_KEY } from "../decorators/roles.decorator.js";
import type { JwtRole } from "../auth.types.js";

/**
 * Enforces @Roles() metadata. Must run after JwtAuthGuard so req.user is populated.
 * If no @Roles() is set, the guard is a no-op (route is open to any authenticated user).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<JwtRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: { role?: JwtRole } }>();
    const role = request.user?.role;
    if (!role || !required.includes(role)) {
      throw new ForbiddenException("Insufficient permissions.");
    }
    return true;
  }
}
