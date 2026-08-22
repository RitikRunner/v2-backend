import { ILike } from "typeorm";
import { AppDataSource } from "../data-source";
import { SocialAccount } from "../entities/SocialAccount";
import {
  SocialConversation,
  SocialConversationPlatform,
} from "../entities/SocialConversation";
import { Lead, LeadChannel, SocialPlatform } from "../entities/Lead";
import {
  Message,
  MessageChannel,
  MessageDirection,
  MessageProvider,
  MessageType,
} from "../entities/Message";
import { User } from "../entities/User";
import { encryptPersonalData, computeBlindIndex } from "../utils/encryption";
import { normalizeEmail } from "../utils/normalize";
import { captureLead } from "./lead-service";
import { assignLeadToConsultant } from "./assignment-service";
import {
  getFbUserProfile,
  MetaParticipant,
  MetaMessage,
} from "./meta-graph-service";
import { logger } from "../utils/logger";
import { env } from "../config/env";

export function platformToLeadChannel(
  platform: "facebook" | "instagram",
): LeadChannel {
  return platform === "facebook" ? LeadChannel.FACEBOOK : LeadChannel.INSTAGRAM;
}

export function platformToMessageChannel(
  platform: "facebook" | "instagram",
): MessageChannel {
  return platform === "facebook"
    ? MessageChannel.FACEBOOK
    : MessageChannel.INSTAGRAM;
}

export function platformToSocialPlatform(
  platform: "facebook" | "instagram",
): SocialPlatform {
  return platform === "facebook"
    ? SocialPlatform.FACEBOOK
    : SocialPlatform.INSTAGRAM;
}

export function platformToConversationPlatform(
  platform: "facebook" | "instagram",
): SocialConversationPlatform {
  return platform === "facebook"
    ? SocialConversationPlatform.FACEBOOK
    : SocialConversationPlatform.INSTAGRAM;
}

export async function matchLeadToParticipant(
  participant: MetaParticipant,
  socialPlatform: SocialPlatform,
): Promise<Lead | null> {
  const leadRepo = AppDataSource.getRepository(Lead);

  const handle = participant.username ?? participant.id;
  if (handle) {
    const byHandle = await leadRepo.findOne({
      where: { socialHandle: handle, socialPlatform },
    });
    if (byHandle) {
      logger.debug({ handle }, "Lead matched by social handle");
      return byHandle;
    }
  }

  if (participant.email) {
    const emailHash = computeBlindIndex(normalizeEmail(participant.email));
    if (emailHash) {
      const byEmail = await leadRepo.findOne({ where: { emailHash } });
      if (byEmail) {
        logger.debug({ email: participant.email }, "Lead matched by email");
        return byEmail;
      }
    }
  }

  if (participant.name?.trim()) {
    const byName = await leadRepo.findOne({
      where: { name: ILike(participant.name.trim()) },
    });
    if (byName) {
      logger.debug({ name: participant.name }, "Lead matched by name");
      return byName;
    }
  }

  return null;
}

export function buildMessageRecord(
  metaMsg: MetaMessage,
  leadId: number,
  clinicAccountId: string,
  msgChannel: MessageChannel,
  seenIds: Set<string>,
): Partial<Message> | null {
  if (seenIds.has(metaMsg.id)) return null;
  seenIds.add(metaMsg.id);

  const isClinic = metaMsg.from.id === clinicAccountId;
  const direction = isClinic
    ? MessageDirection.OUTBOUND
    : MessageDirection.INBOUND;

  const attachment = metaMsg.attachments?.data?.[0];
  let messageType = MessageType.TEXT;
  if (attachment?.mime_type?.startsWith("image/"))
    messageType = MessageType.IMAGE;
  else if (attachment?.mime_type?.startsWith("video/"))
    messageType = MessageType.VIDEO;
  else if (attachment?.mime_type?.startsWith("audio/"))
    messageType = MessageType.AUDIO;
  else if (attachment) messageType = MessageType.DOCUMENT;

  return {
    leadId,
    provider: MessageProvider.META_GRAPH,
    channel: msgChannel,
    direction,
    messageType,
    contentEnc: encryptPersonalData(metaMsg.message ?? ""),
    providerMessageId: metaMsg.id,
    sentAt: new Date(metaMsg.created_time),
    encKeyVersion: env.ENC_KEY_VERSION,
  };
}

// ─── Core conversation processor ─────────────────────────────────────────────

export interface ConversationProcessResult {
  isNewLead: boolean;
  lead: Lead | null;
  newMessages: number;
}

export async function processConversation(
  externalConversationId: string,
  account: SocialAccount,
  accessToken: string,
  participant: MetaParticipant,
  messages: MetaMessage[],
  systemUser: User,
): Promise<ConversationProcessResult> {
  const leadRepo = AppDataSource.getRepository(Lead);
  const convRepo = AppDataSource.getRepository(SocialConversation);
  const msgRepo = AppDataSource.getRepository(Message);

  const platform = account.platform as "facebook" | "instagram";
  const socialPlatform = platformToSocialPlatform(platform);
  const conversationPlatform = platformToConversationPlatform(platform);
  const leadsChannel = platformToLeadChannel(platform);
  const msgChannel = platformToMessageChannel(platform);

  let enriched = participant;
  if (platform === "facebook" && participant.id) {
    enriched = {
      ...participant,
      ...(await getFbUserProfile(participant.id, accessToken)),
    };
  }

  let socialConv = await convRepo.findOne({
    where: { platform: conversationPlatform, externalConversationId },
  });

  let lead: Lead | null = null;
  let isNewLead = false;

  if (socialConv?.leadId) {
    lead = await leadRepo.findOne({ where: { id: socialConv.leadId } });
  }

  if (!lead) {
    lead = await matchLeadToParticipant(enriched, socialPlatform);

    if (!lead) {
      const { lead: newLead } = await captureLead(
        {
          name: enriched.name ?? enriched.username,
          email: enriched.email,
          channel: leadsChannel,
          source:
            platform === "facebook" ? "facebook_messenger" : "instagram_dm",
        },
        systemUser,
      );
      lead = newLead;
      isNewLead = true;

      lead.socialHandle = enriched.username ?? enriched.id;
      lead.socialPlatform = socialPlatform;
      lead.updatedByUserId = systemUser.id;
      await leadRepo.save(lead);

      await assignLeadToConsultant(lead, systemUser.id);
    }
  }

  if (!lead) return { isNewLead: false, lead: null, newMessages: 0 };

  if (!socialConv) {
    socialConv = convRepo.create({
      socialAccountId: account.id,
      platform: conversationPlatform,
      externalConversationId,
      leadId: lead.id,
      participantExternalId: enriched.id,
      participantName: enriched.name ?? null,
      participantUsername: enriched.username ?? null,
    });
  } else if (!socialConv.leadId) {
    socialConv.leadId = lead.id;
  }

  const existingMsgIds = new Set(
    (
      await msgRepo.find({
        where: { conversationId: externalConversationId },
        select: { providerMessageId: true },
      })
    )
      .map((m) => m.providerMessageId)
      .filter(Boolean) as string[],
  );

  const toSave: Partial<Message>[] = [];
  for (const msg of messages) {
    const record = buildMessageRecord(
      msg,
      lead.id,
      account.accountId,
      msgChannel,
      existingMsgIds,
    );
    if (record)
      toSave.push({ ...record, conversationId: externalConversationId });
  }

  let newMessages = 0;
  if (toSave.length > 0) {
    await msgRepo.save(toSave.map((m) => msgRepo.create(m as Message)));
    newMessages = toSave.length;
  }

  const lastMsg = messages.at(-1);
  if (lastMsg) socialConv.lastMessageAt = new Date(lastMsg.created_time);
  socialConv.messageCount = (socialConv.messageCount ?? 0) + newMessages;
  socialConv.importedAt = new Date();
  await convRepo.save(socialConv);

  return { isNewLead, lead, newMessages };
}
