import { Injectable, type NestMiddleware } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { FastifyRequest, FastifyReply } from "fastify";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: FastifyRequest["raw"], res: FastifyReply["raw"], next: () => void) {
    const id = randomUUID();
    (req as unknown as Record<string, unknown>)["requestId"] = id;
    res.setHeader("x-request-id", id);
    next();
  }
}
