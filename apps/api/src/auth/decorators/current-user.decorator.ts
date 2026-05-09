import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { FastifyRequest } from "fastify";

export interface CurrentUserPayload {
  id: string;
  phone?: string;
  name: string | null;
  isVerified?: boolean;
  role?: "admin";
  email?: string;
  vendor?: { id: string; businessName: string; status: string };
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest & { user: CurrentUserPayload }>();
    return request.user;
  },
);
