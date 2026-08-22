import { BadRequestError } from "./app-error";

export function parseOptionalDate(
  value: string | null | undefined,
  fieldName: string,
): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestError(`Invalid ${fieldName}`);
  }
  return date;
}
