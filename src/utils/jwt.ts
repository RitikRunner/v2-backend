import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { durationToMs } from "./duration";

const accessTokenPayloadSchema = z.object({
  sub: z.coerce.number(),
  role: z.string(),
});

export type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: Math.floor(durationToMs(env.ACCESS_TOKEN_TTL) / 1000),
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return accessTokenPayloadSchema.parse(
    jwt.verify(token, env.JWT_ACCESS_SECRET),
  );
}
