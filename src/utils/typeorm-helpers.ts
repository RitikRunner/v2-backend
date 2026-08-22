export function isUniqueConstraintViolation(error: unknown): boolean {
  const typed = error as { code?: string; driverError?: { code?: string } };
  return typed?.code === "23505" || typed?.driverError?.code === "23505";
}
