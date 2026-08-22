import crypto from "node:crypto";
import { expect } from "chai";
import { api, API } from "../support/app";
import { AppDataSource } from "../../data-source";
import { Lead } from "../../entities/Lead";

function makeJdPayload(overrides: Record<string, unknown> = {}) {
  return {
    leadid: `JD_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    name: "JustDial Tester",
    mobile: "9876543210",
    email: "jd@example.com",
    category: "Implants",
    city: "Delhi",
    dncmobile: 0,
    dncphone: 0,
    ...overrides,
  };
}

function makeFormPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "WebForm Tester",
    phone: "9123456789",
    email: "webform@example.com",
    message: "Interested in aligners",
    ...overrides,
  };
}

function signFormPayload(body: Record<string, unknown>): {
  timestamp: string;
  signature: string;
} {
  const secret =
    process.env.FORM_HMAC_SECRET ??
    "dev_form_secret_change_this_for_production_use";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}:${JSON.stringify(body)}`)
    .digest("hex");
  return { timestamp, signature };
}

const JD_SECRET = process.env.JUSTDIAL_WEBHOOK_SECRET ?? "justdial_dev_secret";

describe("Lead Capture Integrations", () => {
  describe("POST /public/webhooks/justdial", () => {
    it("rejects requests with a wrong secret", async () => {
      const res = await api()
        .post(`${API}/public/webhooks/justdial?secret=WRONG_SECRET`)
        .send(makeJdPayload());
      expect(res.status).to.equal(400);
    });

    it("rejects payloads with no contact information", async () => {
      const { mobile: _m, email: _e, ...noContact } = makeJdPayload();
      const res = await api()
        .post(`${API}/public/webhooks/justdial?secret=${JD_SECRET}`)
        .send(noContact);
      expect(res.status).to.equal(400);
    });

    it("creates a new lead from a valid JustDial webhook", async () => {
      const payload = makeJdPayload({
        mobile: "9000000001",
        name: "JD New Lead",
      });
      const res = await api()
        .post(`${API}/public/webhooks/justdial?secret=${JD_SECRET}`)
        .send(payload);

      expect(res.status).to.equal(200);
      expect(res.body.received).to.equal(true);

      const lead = await AppDataSource.getRepository(Lead).findOne({
        where: { adId: payload.leadid },
      });
      expect(lead).to.not.be.null;
      expect(lead!.channel).to.equal("justdial");
    });

    it("sets doNotCall=true when dncmobile flag is 1", async () => {
      const payload = makeJdPayload({ mobile: "9000000002", dncmobile: 1 });
      await api()
        .post(`${API}/public/webhooks/justdial?secret=${JD_SECRET}`)
        .send(payload)
        .expect(200);

      const lead = await AppDataSource.getRepository(Lead).findOne({
        where: { adId: payload.leadid },
      });
      expect(lead!.doNotCall).to.equal(true);
    });

    it("is idempotent — sending the same leadid twice does not create a duplicate", async () => {
      const payload = makeJdPayload({
        mobile: "9000000003",
        leadid: "JD_IDEMPOTENCY_FIXED",
      });

      await api()
        .post(`${API}/public/webhooks/justdial?secret=${JD_SECRET}`)
        .send(payload)
        .expect(200);

      await api()
        .post(`${API}/public/webhooks/justdial?secret=${JD_SECRET}`)
        .send(payload)
        .expect(200);

      const count = await AppDataSource.getRepository(Lead).count({
        where: { adId: "JD_IDEMPOTENCY_FIXED" },
      });
      expect(count).to.equal(1);
    });

    it("creates a re-enquiry when the same phone number submits again", async () => {
      const first = makeJdPayload({
        mobile: "9000000004",
        name: "First Enquiry",
      });
      const second = makeJdPayload({
        mobile: "9000000004",
        name: "Second Enquiry",
      });

      await api()
        .post(`${API}/public/webhooks/justdial?secret=${JD_SECRET}`)
        .send(first)
        .expect(200);

      await api()
        .post(`${API}/public/webhooks/justdial?secret=${JD_SECRET}`)
        .send(second)
        .expect(200);

      const leads = await AppDataSource.getRepository(Lead).find({
        where: { channel: "justdial" as any },
      });
      const original = leads.find((l) => l.adId === first.leadid);
      expect(original!.reEnquiryCount).to.be.greaterThan(0);

      const duplicate = leads.find((l) => l.adId === second.leadid);
      expect(duplicate).to.be.undefined;
    });
  });

  describe("POST /public/leads/web-form", () => {
    it("rejects requests with no HMAC headers", async () => {
      const body = makeFormPayload();
      const res = await api().post(`${API}/public/leads/web-form`).send(body);
      expect(res.status).to.equal(400);
    });

    it("rejects requests with a tampered signature", async () => {
      const body = makeFormPayload();
      const { timestamp } = signFormPayload(body);
      const res = await api()
        .post(`${API}/public/leads/web-form`)
        .set("X-Form-Timestamp", timestamp)
        .set("X-Form-Signature", "badsignature")
        .send(body);
      expect(res.status).to.equal(400);
    });

    it("rejects payloads with no phone and no email", async () => {
      const body = { name: "No Contact" };
      const { timestamp, signature } = signFormPayload(body);
      const res = await api()
        .post(`${API}/public/leads/web-form`)
        .set("X-Form-Timestamp", timestamp)
        .set("X-Form-Signature", signature)
        .send(body);
      expect(res.status).to.equal(400);
    });

    it("creates a new lead from a valid web form submission", async () => {
      const body = makeFormPayload({ phone: "9001000001" });
      const { timestamp, signature } = signFormPayload(body);
      const res = await api()
        .post(`${API}/public/leads/web-form`)
        .set("X-Form-Timestamp", timestamp)
        .set("X-Form-Signature", signature)
        .send(body);

      expect(res.status).to.be.oneOf([200, 201]);
      expect(res.body.received).to.equal(true);
    });

    it("handles a re-enquiry — same phone, second submission bumps counter not a new lead", async () => {
      const body = makeFormPayload({ phone: "9001000002" });

      // First call — new lead, should be 201
      const { timestamp: t1, signature: s1 } = signFormPayload(body);
      await api()
        .post(`${API}/public/leads/web-form`)
        .set("X-Form-Timestamp", t1)
        .set("X-Form-Signature", s1)
        .send(body)
        .expect(201);

      // Second call — same phone, should be re-enquiry → 200
      const { timestamp: t2, signature: s2 } = signFormPayload(body);
      const res = await api()
        .post(`${API}/public/leads/web-form`)
        .set("X-Form-Timestamp", t2)
        .set("X-Form-Signature", s2)
        .send(body);

      expect(res.status).to.equal(200);
      expect(res.body.received).to.equal(true);
    });
  });
});
