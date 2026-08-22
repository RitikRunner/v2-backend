import { env } from "../config/env";
import {
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
} from "../utils/app-error";
import { redis } from "../config/redis";
import { enqueueEmail } from "../queues/email-queue";
import { getUserRepository } from "../repositories/user-repository";
import { generateNumericOtp, sha256 } from "../utils/crypto";
import { logger } from "../utils/logger";
import { otpEmailTemplate } from "./email/template";
import { AuthTokens, issueTokensForUser } from "./token-service";

const otpKey = (email: string) => `otp:${email}`;
const cooldownKey = (email: string) => `otp:cooldown:${email}`;
const attemptsKey = (email: string) => `otp:attempts:${email}`;

export async function createOtp(email: string): Promise<{ message: string }> {
  const user = await getUserRepository().findOne({ where: { email } });
  if (!user || !user.isActive) {
    logger.warn({ email }, "OTP requested for unknown/inactive user");
    throw new NotFoundError(
      "No account is registered with this email address.",
    );
  }

  if (await redis.get(cooldownKey(email))) {
    throw new TooManyRequestsError(
      "Please wait before requesting another OTP.",
    );
  }

  const otp = generateNumericOtp(env.OTP_LENGTH);
  await redis.set(
    otpKey(email),
    sha256(`${email}:${otp}`),
    "EX",
    env.OTP_TTL_SECONDS,
  );
  await redis.set(cooldownKey(email), "1", "EX", env.OTP_RESEND_COOLDOWN);
  await redis.del(attemptsKey(email));

  const tpl = otpEmailTemplate(otp, env.OTP_TTL_SECONDS);
  await enqueueEmail({
    to: email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });

  logger.info({ email }, "OTP generated and queued for delivery");
  return { message: "OTP sent. Please check your email for the code." };
}

export interface VerifyResult extends AuthTokens {
  user: { id: number; email: string; role: string; name: string | null };
}

export async function verifyOtp(
  email: string,
  otp: string,
): Promise<VerifyResult> {
  const stored = await redis.get(otpKey(email));
  if (!stored) throw new UnauthorizedError("Invalid or expired OTP.");

  const attempts = await redis.incr(attemptsKey(email));
  if (attempts === 1)
    await redis.expire(attemptsKey(email), env.OTP_TTL_SECONDS);
  if (attempts > env.OTP_MAX_ATTEMPTS) {
    await redis.del(otpKey(email));
    throw new TooManyRequestsError(
      "Too many invalid attempts. Request a new OTP.",
    );
  }

  if (stored !== sha256(`${email}:${otp}`)) {
    throw new UnauthorizedError("Invalid or expired OTP.");
  }

  await redis.del(otpKey(email));
  await redis.del(attemptsKey(email));

  const users = getUserRepository();
  const user = await users.findOne({ where: { email } });
  if (!user || !user.isActive)
    throw new UnauthorizedError("Account not found or inactive.");

  user.lastLoginAt = new Date();
  await users.save(user);

  logger.info({ userId: user.id }, "User logged in via OTP");
  const tokens = await issueTokensForUser(user);
  return {
    ...tokens,
    user: { id: user.id, email: user.email, role: user.role, name: user.name },
  };
}
