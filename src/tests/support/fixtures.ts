import { redis } from "../../config/redis";
import { sha256 } from "../../utils/crypto";
import { signAccessToken } from "../../utils/jwt";
import { getLeadRepository } from "../../repositories/lead-repository";
import { getUserRepository } from "../../repositories/user-repository";
import { User } from "../../entities/User";
import { Lead } from "../../entities/Lead";

export const SEEDED = {
  admin: "kunal@stunningdentistry.in",
  hod: "hod@stunningdentistry.in",
  crmDomestic: "crm.domestic@stunningdentistry.in",
  crmDomestic2: "crm.domestic2@stunningdentistry.in",
  crmIntl: "crm.intl@stunningdentistry.in",
};

export async function getUser(email: string): Promise<User> {
  const user = await getUserRepository().findOne({ where: { email } });
  if (!user) throw new Error(`Seeded user not found: ${email}`);
  return user;
}

export function bearer(user: User): string {
  return `Bearer ${signAccessToken({ sub: user.id, role: user.role })}`;
}

export async function authFor(email: string): Promise<string> {
  return bearer(await getUser(email));
}

export async function leadOwnedBy(userId: number): Promise<Lead> {
  const lead = await getLeadRepository().findOne({
    where: { ownerUserId: userId },
    order: { id: "ASC" },
  });
  if (!lead) throw new Error(`No seeded lead owned by user ${userId}`);
  return lead;
}

export async function seedOtp(email: string, otp: string): Promise<void> {
  await redis.set(`otp:${email}`, sha256(`${email}:${otp}`), "EX", 300);
}

export function makeLeadPayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: "Test Lead",
    phone: "+919899990000",
    channel: "website",
    ...overrides,
  };
}
