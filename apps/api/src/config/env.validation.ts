import * as Joi from "joi";

const PLACEHOLDERS = [
  "change_me_in_production_min_32_chars",      // JWT_SECRET example
  "change_me_too_in_production_min_32",        // JWT_REFRESH_SECRET example
  "change_me_cookie_secret_min_32_chars",      // COOKIE_SECRET example
  "sario-cookie-secret",                       // legacy hardcoded fallback
];

const secret = Joi.string()
  .min(32)
  .invalid(...PLACEHOLDERS);

// Required in production, optional (and allowed empty) otherwise. Built on a
// string base so the schema stays typed as StringSchema under strict mode.
const prodRequiredString = Joi.string().when("NODE_ENV", {
  is: "production",
  then: Joi.required(),
  otherwise: Joi.optional().allow(""),
});

const schema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "test", "production")
    .default("development"),
  PORT: Joi.number().default(4000),
  DATABASE_URL: Joi.string().required(),
  REDIS_HOST: Joi.string().default("localhost"),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow("").optional(),
  MEILI_HOST: Joi.string().required(),
  MEILI_API_KEY: Joi.string().required(),
  JWT_SECRET: secret.required(),
  JWT_REFRESH_SECRET: secret.required(),
  COOKIE_SECRET: secret.required(),
  RAZORPAY_KEY_ID: prodRequiredString,
  RAZORPAY_KEY_SECRET: prodRequiredString,
  RAZORPAY_WEBHOOK_SECRET: prodRequiredString,
  RAZORPAY_ACCOUNT_NUMBER: Joi.string().optional().allow(""),
  PLATFORM_COMMISSION_BPS: Joi.number().min(0).max(10000).default(1500),
  SENTRY_DSN: Joi.string().uri().optional().allow(""),
  ALLOWED_ORIGINS: Joi.string().optional(),
}).unknown(true);

export function validateEnv(config: Record<string, unknown>) {
  const { error, value } = schema.validate(config, { abortEarly: false });
  if (error) {
    throw new Error(`Environment validation failed: ${error.message}`);
  }
  return value;
}
