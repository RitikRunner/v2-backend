import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { LeadChannel } from "../entities/Lead";
import { InboundEvent } from "../entities/InboundEvent";
import { captureLead } from "./lead-service";
import { assignLeadToConsultant } from "./assignment-service";
import { parseEmailToLead } from "../utils/parse-email-lead";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { isUniqueConstraintViolation } from "../utils/typeorm-helpers";

export interface EmailLeadPollResult {
  processed: number;
  newLeads: number;
  reEnquiries: number;
  skipped: number;
  errors: number;
}

const processedMessageIds = new Set<string>();

export async function pollEmailLeads(): Promise<EmailLeadPollResult> {
  if (!env.IMAP_LEAD_ENABLED) {
    return { processed: 0, newLeads: 0, reEnquiries: 0, skipped: 0, errors: 0 };
  }

  if (!env.IMAP_LEAD_USER || !env.IMAP_LEAD_PASSWORD) {
    logger.warn("IMAP_LEAD_USER or IMAP_LEAD_PASSWORD not set");
    return { processed: 0, newLeads: 0, reEnquiries: 0, skipped: 0, errors: 0 };
  }

  const systemUser = await AppDataSource.getRepository(User).findOne({
    where: { id: env.SYSTEM_USER_EMAIL_LEAD_ID, isActive: true },
  });
  if (!systemUser) {
    logger.error(
      "Email lead bot user not found (id=%d)",
      env.SYSTEM_USER_EMAIL_LEAD_ID,
    );
    return { processed: 0, newLeads: 0, reEnquiries: 0, skipped: 0, errors: 0 };
  }

  const result: EmailLeadPollResult = {
    processed: 0,
    newLeads: 0,
    reEnquiries: 0,
    skipped: 0,
    errors: 0,
  };

  const client = new ImapFlow({
    host: env.IMAP_LEAD_HOST,
    port: env.IMAP_LEAD_PORT,
    secure: env.IMAP_LEAD_TLS,
    auth: { user: env.IMAP_LEAD_USER, pass: env.IMAP_LEAD_PASSWORD },
    logger: false,
  });

  client.on("error", (err) => {
    logger.error({ err }, "IMAP client error");
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const searchResult = await client.search({ all: true }, { uid: true });
      const allUids = Array.isArray(searchResult) ? searchResult : [];

      if (allUids.length === 0) return result;

      const eventRepo = AppDataSource.getRepository(InboundEvent);

      for await (const message of client.fetch(
        allUids,
        { uid: true, source: true },
        { uid: true },
      )) {
        result.processed++;

        try {
          const rawSource = message.source;
          if (!rawSource) {
            result.skipped++;
            continue;
          }

          const sourceBuffer = Buffer.isBuffer(rawSource)
            ? rawSource
            : Buffer.from(rawSource as unknown as string);

          const parsed = await simpleParser(sourceBuffer);

          const messageId = parsed.messageId?.trim().slice(0, 512);

          if (messageId) {
            if (processedMessageIds.has(messageId)) {
              result.skipped++;
              continue;
            }

            const alreadyIngested = await eventRepo.findOne({
              where: { channel: "email", externalEventId: messageId },
            });

            if (alreadyIngested) {
              processedMessageIds.add(messageId);
              result.skipped++;
              continue;
            }
          }

          const leadData = parseEmailToLead(parsed);

          const { lead, isNew } = await captureLead(
            {
              name: leadData.name,
              phone: leadData.phone,
              email: leadData.email,
              message: leadData.message,
              channel: LeadChannel.EMAIL,
              source: "email_inbox",
              campaign: leadData.subject?.slice(0, 160),
            },
            systemUser,
          );

          if (messageId) {
            processedMessageIds.add(messageId);
            await eventRepo
              .save(
                eventRepo.create({
                  channel: LeadChannel.EMAIL,
                  externalEventId: messageId,
                }),
              )
              .catch((e: unknown) => {
                if (!isUniqueConstraintViolation(e)) {
                  logger.warn(
                    { err: e },
                    "Failed to persist InboundEvent deduplication record",
                  );
                }
              });
          }

          if (isNew) {
            await assignLeadToConsultant(lead, systemUser.id);
            result.newLeads++;
          } else {
            result.reEnquiries++;
          }

          logger.info(
            {
              leadId: lead.id,
              isNew,
              messageId,
              from: leadData.rawFrom,
              subject: leadData.subject,
            },
            "Email lead processed",
          );
        } catch (err) {
          logger.error({ uid: message.uid, err }, "Failed to process email");
          result.errors++;
        }
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    logger.error({ err }, "IMAP poll failed");
    result.errors++;
  } finally {
    await client.logout().catch(() => {});
  }

  logger.info(result, "Email lead poll complete");
  return result;
}

let pollTimer: ReturnType<typeof setTimeout> | null = null;

export function startEmailLeadPoller(): void {
  if (!env.IMAP_LEAD_ENABLED) {
    logger.info("Email lead poller disabled");
    return;
  }

  if (pollTimer) return;

  logger.info(
    { host: env.IMAP_LEAD_HOST, user: env.IMAP_LEAD_USER },
    "Email lead poller started",
  );

  const runPoll = async () => {
    await pollEmailLeads().catch((err) =>
      logger.error({ err }, "Email lead poll error"),
    );
    pollTimer = setTimeout(runPoll, env.IMAP_LEAD_POLL_MS);
  };

  void runPoll();
}

export function stopEmailLeadPoller(): void {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}
