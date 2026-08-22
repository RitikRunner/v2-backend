import { IsNull } from "typeorm";
import { getSessionRepository } from "../repositories/session-repository";
import { signAccessToken } from "../utils/jwt";
import { generateOpaqueToken, sha256 } from "../utils/crypto";
import { durationToMs } from "../utils/duration";
import { env } from "../config/env";
import { User } from "../entities/User";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export async function issueTokensForUser(user: User): Promise<AuthTokens> {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });

  const refreshToken = generateOpaqueToken();
  const sessions = getSessionRepository();
  await sessions.save(
    sessions.create({
      userId: user.id,
      refreshTokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + durationToMs(env.REFRESH_TOKEN_TTL)),
    }),
  );

  return { accessToken, refreshToken };
}

// Revoke a single active session by its refresh token (idempotent: revoking a
// missing/already-revoked session is a no-op). Scoped to the user so one user
// can never revoke another's session.
export async function revokeSession(
  userId: number,
  refreshToken: string,
): Promise<void> {
  await getSessionRepository().update(
    { userId, refreshTokenHash: sha256(refreshToken), revokedAt: IsNull() },
    { revokedAt: new Date() },
  );
}

// Revoke every active session for a user ("log out everywhere").
export async function revokeAllSessions(userId: number): Promise<void> {
  await getSessionRepository().update(
    { userId, revokedAt: IsNull() },
    { revokedAt: new Date() },
  );
}
