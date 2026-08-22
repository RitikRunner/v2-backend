import { Activity } from "../entities/Activity";
import { decryptPersonalData } from "../utils/encryption";

function decryptField(
  encryptedBuffer: Buffer | null,
  keyVersion: number,
): string | null {
  return encryptedBuffer
    ? decryptPersonalData(encryptedBuffer, keyVersion)
    : null;
}

export function toActivityDto(activity: Activity) {
  const keyVersion = activity.encKeyVersion ?? 1;
  return {
    id: activity.id,
    leadId: activity.leadId,
    userId: activity.userId,
    user: activity.user
      ? {
          id: activity.user.id,
          name: activity.user.name,
          email: activity.user.email,
          role: activity.user.role,
        }
      : null,
    previousOwnerId: activity.previousOwnerId,
    newOwnerId: activity.newOwnerId,
    type: activity.type,
    direction: activity.direction,
    durationSeconds: activity.durationSeconds,
    outcome: activity.outcome,
    subject: activity.subject,
    content: decryptField(activity.contentEnc, keyVersion),
    statusFrom: activity.statusFrom,
    statusTo: activity.statusTo,
    relatedAppointmentId: activity.relatedAppointmentId,
    relatedMessageId: activity.relatedMessageId,
    createdAt: activity.createdAt,
    updatedAt: activity.updatedAt,
  };
}

export type ActivityDto = ReturnType<typeof toActivityDto>;
