import { AppDataSource } from "../data-source";
import {
  SocialAccount,
  SocialAccountPlatform,
} from "../entities/SocialAccount";
import { LeadChannel } from "../entities/Lead";
import { InboundEvent } from "../entities/InboundEvent";
import { User } from "../entities/User";
import { decryptPersonalData } from "../utils/encryption";
import { processConversation } from "./social-conversation-processor";
import { logger } from "../utils/logger";
import { env } from "../config/env";
import { isUniqueConstraintViolation } from "../utils/typeorm-helpers";

export enum MetaWebhookObjectType {
  PAGE = "page",
  INSTAGRAM = "instagram",
}

export enum MetaAttachmentType {
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
}

export enum DefaultMimeType {
  IMAGE_JPEG = "image/jpeg",
  VIDEO_MP4 = "video/mp4",
  AUDIO_MPEG = "audio/mpeg",
  OCTET_STREAM = "application/octet-stream",
}

export interface MetaWebhookMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: Array<{
      type: string;
      payload: { url?: string; mime_type?: string };
    }>;
  };
  postback?: { title: string; payload: string };
}

export interface MetaWebhookEntry {
  id: string;
  time: number;
  messaging?: MetaWebhookMessagingEvent[];
  changes?: unknown[];
}

export interface MetaWebhookPayload {
  object: MetaWebhookObjectType | string;
  entry: MetaWebhookEntry[];
}

function webhookObjectToPlatform(object: string): SocialAccountPlatform {
  return object === MetaWebhookObjectType.PAGE
    ? SocialAccountPlatform.FACEBOOK
    : SocialAccountPlatform.INSTAGRAM;
}

export async function processMetaWebhookEntry(
  payload: MetaWebhookPayload,
): Promise<void> {
  const accountPlatform = webhookObjectToPlatform(payload.object);
  const leadChannel =
    accountPlatform === SocialAccountPlatform.FACEBOOK
      ? LeadChannel.FACEBOOK
      : LeadChannel.INSTAGRAM;
  const accountRepo = AppDataSource.getRepository(SocialAccount);

  const systemUser = await AppDataSource.getRepository(User).findOne({
    where: { id: env.SYSTEM_USER_META_ID, isActive: true },
  });
  if (!systemUser) {
    logger.error("Meta system bot user not found — cannot process webhook");
    return;
  }

  for (const entry of payload.entry) {
    const pageAccountId = entry.id;

    const account = await accountRepo.findOne({
      where: {
        accountId: pageAccountId,
        platform: accountPlatform,
        isActive: true,
      },
    });

    if (!account) {
      logger.warn(
        { pageAccountId, platform: accountPlatform },
        "Received webhook for unknown/inactive social account — skipping",
      );
      continue;
    }

    const accessToken = decryptPersonalData(
      account.pageAccessTokenEnc,
      account.encKeyVersion,
    );
    const messagingEvents = entry.messaging ?? [];

    for (const event of messagingEvents) {
      if (!event.message) continue;

      const senderId = event.sender.id;
      const mid = event.message.mid;

      const eventRepo = AppDataSource.getRepository(InboundEvent);
      try {
        await eventRepo.save(
          eventRepo.create({
            channel: leadChannel,
            externalEventId: mid,
          }),
        );
      } catch (err: unknown) {
        if (isUniqueConstraintViolation(err)) {
          logger.info(
            { mid, platform: accountPlatform, senderId },
            "Skipping duplicate Meta messaging event",
          );
          continue;
        }
        logger.warn(
          { err, mid },
          "Failed to save InboundEvent deduplication record for Meta event",
        );
      }

      const syntheticConvId = `live_${accountPlatform}_${pageAccountId}_${senderId}`;

      const metaMsg = {
        id: mid,
        message: event.message.text ?? "",
        created_time: new Date(event.timestamp).toISOString(),
        from: { id: senderId },
        attachments: event.message.attachments
          ? {
              data: event.message.attachments.map((a) => ({
                mime_type:
                  a.payload?.mime_type ?? mimeFromAttachmentType(a.type),
                file_url: a.payload?.url,
              })),
            }
          : undefined,
      };

      try {
        const result = await processConversation(
          syntheticConvId,
          account,
          accessToken,
          { id: senderId },
          [metaMsg],
          systemUser,
        );

        logger.info(
          {
            platform: accountPlatform,
            senderId,
            mid,
            isNewLead: result.isNewLead,
            leadId: result.lead?.id,
          },
          "Live webhook event processed",
        );
      } catch (err) {
        logger.error(
          { mid, senderId, platform: accountPlatform, err },
          "Failed to process live webhook event",
        );
      }
    }
  }
}

function mimeFromAttachmentType(type: string): string {
  switch (type) {
    case MetaAttachmentType.IMAGE:
      return DefaultMimeType.IMAGE_JPEG;
    case MetaAttachmentType.VIDEO:
      return DefaultMimeType.VIDEO_MP4;
    case MetaAttachmentType.AUDIO:
      return DefaultMimeType.AUDIO_MPEG;
    default:
      return DefaultMimeType.OCTET_STREAM;
  }
}
