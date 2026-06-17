import * as Sentry from "@sentry/node";

export function initSentry(): boolean {
  const dsn = process.env["SENTRY_DSN"];
  if (!dsn) return false;
  Sentry.init({ dsn, environment: process.env["NODE_ENV"], tracesSampleRate: 0.1 });
  return true;
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!process.env["SENTRY_DSN"]) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}
