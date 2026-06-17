import { SetMetadata } from "@nestjs/common";
import type { JwtRole } from "../auth.types.js";

export const ROLES_KEY = "roles";

/** Restrict a route (or controller) to the given JWT roles. Requires RolesGuard. */
export const Roles = (...roles: JwtRole[]) => SetMetadata(ROLES_KEY, roles);
