import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { env } from "../config/env";
import { BadRequestError } from "./app-error";

export interface NormalizedPhone {
  e164: string;
  countryCode: string | null;
  isInternational: boolean;
}

export function normalizePhone(
  raw: string,
  defaultCountry: string = env.DEFAULT_COUNTRY,
): NormalizedPhone | null {
  const parsed = parsePhoneNumberFromString(raw, defaultCountry as CountryCode);
  if (!parsed || !parsed.isValid()) return null;
  const countryCode = parsed.country ?? null;
  return {
    e164: parsed.number,
    countryCode,
    isInternational: countryCode !== defaultCountry,
  };
}

export interface NormalizedPhoneStrict {
  e164: string;
  countryCode: string | null;
}

export function normalizePhoneOrThrow(
  rawPhoneNumber: string,
  fieldName: string,
): NormalizedPhoneStrict {
  const normalized = normalizePhone(rawPhoneNumber);
  if (!normalized) throw new BadRequestError(`Invalid ${fieldName}`);
  return { e164: normalized.e164, countryCode: normalized.countryCode };
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}
