import crypto from "node:crypto";
import { expect } from "chai";
import { api, API } from "../support/app";
import { env } from "../../config/env";
import { AppDataSource } from "../../data-source";
import { InboundEvent } from "../../entities/InboundEvent";

function signMetaPayload(
  payload: string,
  secret = env.META_APP_SECRET,
): string {
  return (
    "sha256=" +
    crypto.createHmac("sha256", secret).update(payload).digest("hex")
  );
}

describe("Meta (Facebook & Instagram) Webhook Integration & Deduplication", () => {
  const endpoint = `${API}/public/webhooks/meta`;
  const eventRepo = () => AppDataSource.getRepository(InboundEvent);

  beforeEach(async () => {
    await eventRepo()
      .createQueryBuilder()
      .delete()
      .where("externalEventId LIKE :prefix", { prefix: "mid_test_%" })
      .execute();
  });

  afterEach(async () => {
    await eventRepo()
      .createQueryBuilder()
      .delete()
      .where("externalEventId LIKE :prefix", { prefix: "mid_test_%" })
      .execute();
  });

  describe("GET /public/webhooks/meta — Verification Handshake", () => {
    it("returns 200 and echoes hub.challenge when verify_token matches", async () => {
      const res = await api().get(endpoint).query({
        "hub.mode": "subscribe",
        "hub.challenge": "123456789",
        "hub.verify_token": env.META_WEBHOOK_VERIFY_TOKEN,
      });

      expect(res.status).to.equal(200);
      expect(res.text).to.equal("123456789");
    });

    it("rejects verification requests with invalid verify_token", async () => {
      const res = await api().get(endpoint).query({
        "hub.mode": "subscribe",
        "hub.challenge": "987654321",
        "hub.verify_token": "WRONG_TOKEN_VALUE",
      });

      expect(res.status).to.equal(403);
    });
  });

  describe("POST /public/webhooks/meta — Fast-Ack & HMAC Protection", () => {
    it("rejects payloads missing X-Hub-Signature-256 header with 400", async () => {
      const body = JSON.stringify({ object: "page", entry: [] });
      const res = await api()
        .post(endpoint)
        .set("Content-Type", "application/json")
        .send(body);

      expect(res.status).to.equal(400);
    });

    it("rejects payloads with tampered HMAC signatures", async () => {
      const body = JSON.stringify({ object: "page", entry: [] });
      const res = await api()
        .post(endpoint)
        .set("Content-Type", "application/json")
        .set("X-Hub-Signature-256", "sha256=invalidhashvaluehere")
        .send(body);

      expect(res.status).to.equal(400);
    });

    it("accepts valid signed payload and responds within 5 seconds with fast 200 OK", async () => {
      const bodyObj = {
        object: "instagram",
        entry: [
          {
            id: "IG_ACCOUNT_ID_123",
            time: Date.now(),
            messaging: [
              {
                sender: { id: "INSTAGRAM_PATIENT_001" },
                recipient: { id: "IG_ACCOUNT_ID_123" },
                timestamp: Date.now(),
                message: {
                  mid: `mid_test_${Date.now()}`,
                  text: "Hi, how much do aligners cost?",
                },
              },
            ],
          },
        ],
      };
      const rawBody = JSON.stringify(bodyObj);
      const signature = signMetaPayload(rawBody);

      const startTime = Date.now();
      const res = await api()
        .post(endpoint)
        .set("Content-Type", "application/json")
        .set("X-Hub-Signature-256", signature)
        .send(rawBody);
      const elapsed = Date.now() - startTime;

      expect(res.status).to.equal(200);
      expect(res.body.ok).to.equal(true);
      expect(elapsed).to.be.lessThan(2000);
    });
  });
});
