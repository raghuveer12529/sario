import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { captureException } from "./sentry.js";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("Exceptions");

  constructor(private readonly report: typeof captureException = captureException) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const req = ctx.getRequest<FastifyRequest>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body =
      exception instanceof HttpException ? exception.getResponse() : "Internal server error";

    if (status >= 500) {
      this.logger.error(`${req.url} → ${status}`, exception instanceof Error ? exception.stack : "");
      this.report(exception, { url: req.url });
    }

    // Fire-and-forget: filter signature is void; reply.send() resolves on its own.
    void reply
      .status(status)
      .send(typeof body === "string" ? { statusCode: status, message: body } : { ...body, statusCode: status });
  }
}
