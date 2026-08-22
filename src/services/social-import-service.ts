import { AppDataSource } from "../data-source";
import { SocialAccount } from "../entities/SocialAccount";
import { User } from "../entities/User";
import { decryptPersonalData } from "../utils/encryption";
import {
  listConversations,
  listConversationMessages,
} from "./meta-graph-service";
import { processConversation } from "./social-conversation-processor";
import { logger } from "../utils/logger";
import { env } from "../config/env";

export interface SocialImportResult {
  socialAccountId: number;
  platform: string;
  newLeads: number;
  matchedLeads: number;
  newMessages: number;
  skippedConversations: number;
  errors: Array<{ conversationId: string; error: string }>;
}

export async function runSocialImport(
  socialAccountId: number,
  since?: string,
): Promise<SocialImportResult> {
  const accountRepo = AppDataSource.getRepository(SocialAccount);

  const account = await accountRepo.findOne({
    where: { id: socialAccountId, isActive: true },
  });
  if (!account)
    throw new Error(`SocialAccount ${socialAccountId} not found or inactive`);

  const accessToken = decryptPersonalData(
    account.pageAccessTokenEnc,
    account.encKeyVersion,
  );
  const metaPlatform =
    account.platform === "facebook" ? "messenger" : "instagram";

  const systemUser = await AppDataSource.getRepository(User).findOne({
    where: { id: env.SYSTEM_USER_META_ID, isActive: true },
  });
  if (!systemUser) throw new Error("Meta system bot user not found");

  const result: SocialImportResult = {
    socialAccountId,
    platform: account.platform,
    newLeads: 0,
    matchedLeads: 0,
    newMessages: 0,
    skippedConversations: 0,
    errors: [],
  };

  const importSince = since ?? account.lastImportAt?.toISOString();
  let after = account.lastImportCursor ?? undefined;

  do {
    const page = await listConversations(
      account.accountId,
      metaPlatform,
      accessToken,
      after,
      importSince,
    );

    for (const conv of page.data) {
      // Extract external participant from the conversation participants
      const externalParticipant = (conv.participants?.data ?? []).find(
        (p) => p.id !== account.accountId,
      );

      if (!externalParticipant) {
        result.skippedConversations++;
        continue;
      }

      try {
        // Fetch all messages for this conversation (bulk import fetches full history)
        const messages = await listConversationMessages(conv.id, accessToken);

        const processed = await processConversation(
          conv.id,
          account,
          accessToken,
          externalParticipant,
          messages,
          systemUser,
        );

        if (processed.isNewLead) result.newLeads++;
        else if (processed.lead) result.matchedLeads++;
        result.newMessages += processed.newMessages;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(
          { conversationId: conv.id, err },
          "Failed to process conversation",
        );
        result.errors.push({ conversationId: conv.id, error: msg });
      }
    }

    after = page.paging?.cursors?.after;
    if (!page.paging?.next) break;
  } while (after);

  // Update account metadata
  account.lastImportAt = new Date();
  account.lastImportCursor = after ?? null;
  await accountRepo.save(account);

  return result;
}
