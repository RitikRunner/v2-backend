import { createHmac, timingSafeEqual } from "node:crypto";

export function signHmacSha256(secret: string, message: string): string {
  return createHmac("sha256", secret).update(message).digest("hex");
}

export function verifyHmacTimestamp(
  secret: string,
  message: string,
  signature: string,
  timestamp: number,
  maxAgeSeconds: number,
): boolean {
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > maxAgeSeconds) return false;

  const expected = signHmacSha256(secret, message);
  try {
    return timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    return false;
  }
}
