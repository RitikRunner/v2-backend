import { env } from "../config/env";
import { logger } from "../utils/logger";

// ─── Meta Graph API response shapes ──────────────────────────────────────────

export interface MetaParticipant {
  id: string;
  name?: string;
  username?: string; // IG only
  email?: string; // FB only, when accessible
}

export interface MetaMessage {
  id: string;
  message?: string;
  created_time: string;
  from: MetaParticipant;
  attachments?: {
    data: Array<{ mime_type?: string; file_url?: string }>;
  };
}

export interface MetaConversation {
  id: string;
  updated_time: string;
  participants: {
    data: MetaParticipant[];
  };
  messages?: {
    data: MetaMessage[];
    paging?: MetaPaging;
  };
}

export interface MetaPaging {
  cursors?: { before: string; after: string };
  next?: string;
}

export interface ConversationListResponse {
  data: MetaConversation[];
  paging?: MetaPaging;
}

const baseUrl = `${env.META_GRAPH_BASE_URL}/${env.META_GRAPH_API_VERSION}`;

async function metaFetch<T>(
  path: string,
  accessToken: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${baseUrl}/${path}`);
  url.searchParams.set("access_token", accessToken);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    env.META_GRAPH_TIMEOUT_MS,
  );

  let response: Response;
  try {
    response = await fetch(url.toString(), { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const msg = `Meta Graph API error ${response.status}: ${body.slice(0, 200)}`;
    logger.error({ url: url.pathname, status: response.status }, msg);
    throw new Error(msg);
  }

  return response.json() as Promise<T>;
}

export async function listConversations(
  accountId: string,
  platform: "messenger" | "instagram",
  accessToken: string,
  after?: string,
  since?: string,
): Promise<ConversationListResponse> {
  const params: Record<string, string> = {
    platform,
    fields: "id,updated_time,participants{id,name,username,email}",
    limit: "100",
  };
  if (after) params["after"] = after;
  if (since) params["since"] = since;

  return metaFetch<ConversationListResponse>(
    `${accountId}/conversations`,
    accessToken,
    params,
  );
}

export async function listConversationMessages(
  conversationId: string,
  accessToken: string,
): Promise<MetaMessage[]> {
  const messages: MetaMessage[] = [];
  let after: string | undefined;

  do {
    const params: Record<string, string> = {
      fields: "id,message,created_time,from,attachments{mime_type,file_url}",
      limit: "200",
    };
    if (after) params["after"] = after;

    const page = await metaFetch<{ data: MetaMessage[]; paging?: MetaPaging }>(
      `${conversationId}/messages`,
      accessToken,
      params,
    );

    messages.push(...page.data);
    after = page.paging?.cursors?.after;

    if (!page.paging?.next) break;
  } while (after);

  return messages.reverse();
}

export async function getFbUserProfile(
  userId: string,
  accessToken: string,
): Promise<Partial<MetaParticipant>> {
  try {
    return await metaFetch<Partial<MetaParticipant>>(userId, accessToken, {
      fields: "id,name,email",
    });
  } catch (err) {
    logger.warn(
      { userId, err },
      "Failed to fetch FB user profile — continuing",
    );
    return { id: userId };
  }
}
