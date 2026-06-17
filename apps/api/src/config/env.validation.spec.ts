import { validateEnv } from "./env.validation.js";

const base = {
  NODE_ENV: "production",
  JWT_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  COOKIE_SECRET: "c".repeat(32),
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  MEILI_HOST: "http://localhost:7700",
  MEILI_API_KEY: "key",
  RAZORPAY_KEY_ID: "rzp_live_x",
  RAZORPAY_KEY_SECRET: "secret",
  RAZORPAY_WEBHOOK_SECRET: "whsec",
};

describe("validateEnv", () => {
  it("passes with valid production config", () => {
    expect(() => validateEnv(base)).not.toThrow();
  });
  it("rejects placeholder JWT secret in production", () => {
    expect(() => validateEnv({ ...base, JWT_SECRET: "change_me_in_production_min_32_chars" })).toThrow(/JWT_SECRET/);
  });
  it("rejects too-short secret", () => {
    expect(() => validateEnv({ ...base, COOKIE_SECRET: "short" })).toThrow(/COOKIE_SECRET/);
  });
  it("requires Razorpay keys in production", () => {
    const { RAZORPAY_KEY_ID, ...noRzp } = base;
    expect(() => validateEnv(noRzp)).toThrow(/RAZORPAY_KEY_ID/);
  });
  it("allows missing third-party keys in development (mock mode)", () => {
    const { RAZORPAY_KEY_ID, ...noRzp } = base;
    expect(() => validateEnv({ ...noRzp, NODE_ENV: "development" })).not.toThrow();
  });
});
