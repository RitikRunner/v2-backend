import { createHash, randomInt, randomBytes } from "node:crypto";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function generateNumericOtp(length: number): string {
  return randomInt(0, 10 ** length)
    .toString()
    .padStart(length, "0");
}

export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}
