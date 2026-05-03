import { randomInt, randomBytes, createHash } from "crypto";
import * as bcrypt from "bcrypt";

const BCRYPT_ROUNDS = 10;

export function generateOtp(): string {
  return randomInt(100000, 999999).toString();
}

export function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, BCRYPT_ROUNDS);
}

export function verifyOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString("hex");
}

/** SHA-256 is sufficient for random 32-byte tokens — no need for bcrypt here */
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
