import { expect } from "chai";
import { api, API } from "../support/app";
import { getLeadRepository } from "../../repositories/lead-repository";
import {
  SEEDED,
  authFor,
  bearer,
  getUser,
  leadOwnedBy,
  makeLeadPayload,
} from "../support/fixtures";

describe("Lead routes", () => {
  it("rejects every route without authentication", async () => {
    await api().post(`${API}/leads`).send(makeLeadPayload()).expect(401);
    await api().get(`${API}/leads`).expect(401);
    await api().get(`${API}/leads/1`).expect(401);
    await api()
      .patch(`${API}/leads/1`)
      .send({ stage: "interested" })
      .expect(401);
  });

  describe("POST /leads", () => {
    it("creates a new lead and returns a DPDP-safe DTO", async () => {
      const auth = await authFor(SEEDED.crmDomestic);
      const res = await api()
        .post(`${API}/leads`)
        .set("Authorization", auth)
        .send(makeLeadPayload({ phone: "+919899990000", name: "Nikhil" }));

      expect(res.status).to.equal(201);
      expect(res.body.isNew).to.equal(true);
      expect(res.body.lead.phone).to.equal("+919899990000");

      const leaked = Object.keys(res.body.lead).filter(
        (key) =>
          key.endsWith("Enc") ||
          key.endsWith("Hash") ||
          key === "encKeyVersion",
      );
      expect(leaked).to.deep.equal([]);

      const stored = await getLeadRepository().findOne({
        where: { id: res.body.lead.id },
      });
      expect(stored?.phoneEnc).to.be.instanceOf(Buffer);
      expect(stored?.phoneHash).to.be.instanceOf(Buffer);
    });

    it("dedupes a re-enquiry by blind index instead of duplicating", async () => {
      const auth = await authFor(SEEDED.crmDomestic);
      const first = await api()
        .post(`${API}/leads`)
        .set("Authorization", auth)
        .send(makeLeadPayload({ phone: "+919899990000" }));
      expect(first.status).to.equal(201);

      const second = await api()
        .post(`${API}/leads`)
        .set("Authorization", auth)
        .send(makeLeadPayload({ phone: "+919899990000" }));
      expect(second.status).to.equal(200);
      expect(second.body.isNew).to.equal(false);
      expect(second.body.lead.id).to.equal(first.body.lead.id);
    });

    it("returns 400 when no contact channel is provided", async () => {
      const auth = await authFor(SEEDED.crmDomestic);
      const res = await api()
        .post(`${API}/leads`)
        .set("Authorization", auth)
        .send({ name: "No Contact" });
      expect(res.status).to.equal(400);
    });
  });

  describe("GET /leads", () => {
    it("returns all leads for a manager", async () => {
      const res = await api()
        .get(`${API}/leads`)
        .set("Authorization", await authFor(SEEDED.admin));
      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(5);
      expect(res.body.items).to.have.length(5);
    });

    it("scopes results to the owner for a non-manager", async () => {
      const crm = await getUser(SEEDED.crmDomestic);
      const res = await api()
        .get(`${API}/leads`)
        .set("Authorization", bearer(crm));
      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(2);
      for (const lead of res.body.items) {
        expect(lead.ownerUserId).to.equal(crm.id);
      }
    });

    it("filters by stage", async () => {
      const res = await api()
        .get(`${API}/leads?stage=new_lead`)
        .set("Authorization", await authFor(SEEDED.admin));
      expect(res.body.total).to.equal(3);
      for (const lead of res.body.items)
        expect(lead.stage).to.equal("new_lead");
    });

    it("filters by isInternational", async () => {
      const res = await api()
        .get(`${API}/leads?isInternational=true`)
        .set("Authorization", await authFor(SEEDED.admin));
      expect(res.body.total).to.equal(2);
      for (const lead of res.body.items) {
        expect(lead.isInternational).to.equal(true);
      }
    });

    it("searches by name", async () => {
      const res = await api()
        .get(`${API}/leads?q=aarav`)
        .set("Authorization", await authFor(SEEDED.admin));
      expect(res.body.total).to.equal(1);
      expect(res.body.items[0].name).to.equal("Aarav Sharma");
    });

    it("paginates", async () => {
      const res = await api()
        .get(`${API}/leads?page=1&pageSize=2`)
        .set("Authorization", await authFor(SEEDED.admin));
      expect(res.body.items).to.have.length(2);
      expect(res.body.total).to.equal(5);
      expect(res.body.pageSize).to.equal(2);
    });
  });

  describe("GET /leads/:id", () => {
    it("returns a lead to its owner", async () => {
      const crm = await getUser(SEEDED.crmDomestic);
      const lead = await leadOwnedBy(crm.id);
      const res = await api()
        .get(`${API}/leads/${lead.id}`)
        .set("Authorization", bearer(crm));
      expect(res.status).to.equal(200);
      expect(res.body.lead.id).to.equal(lead.id);
    });

    it("hides another owner's lead from a non-manager", async () => {
      const intl = await getUser(SEEDED.crmIntl);
      const otherLead = await leadOwnedBy(intl.id);
      const res = await api()
        .get(`${API}/leads/${otherLead.id}`)
        .set("Authorization", await authFor(SEEDED.crmDomestic));
      expect(res.status).to.equal(404);
    });

    it("returns 404 for a missing lead", async () => {
      const res = await api()
        .get(`${API}/leads/999999`)
        .set("Authorization", await authFor(SEEDED.admin));
      expect(res.status).to.equal(404);
    });
  });

  describe("PATCH /leads/:id", () => {
    it("updates fields for the owner", async () => {
      const crm = await getUser(SEEDED.crmDomestic);
      const lead = await leadOwnedBy(crm.id);
      const res = await api()
        .patch(`${API}/leads/${lead.id}`)
        .set("Authorization", bearer(crm))
        .send({ stage: "interested", doNotCall: true });
      expect(res.status).to.equal(200);
      expect(res.body.lead.stage).to.equal("interested");
      expect(res.body.lead.doNotCall).to.equal(true);
    });

    it("lets an owner reassign their own lead", async () => {
      const crm = await getUser(SEEDED.crmDomestic);
      const target = await getUser(SEEDED.crmDomestic2);
      const lead = await leadOwnedBy(crm.id);
      const res = await api()
        .patch(`${API}/leads/${lead.id}`)
        .set("Authorization", bearer(crm))
        .send({ ownerUserId: target.id });
      expect(res.status).to.equal(200);
      expect(res.body.lead.ownerUserId).to.equal(target.id);
    });

    it("hides another owner's lead from a non-manager", async () => {
      const intl = await getUser(SEEDED.crmIntl);
      const otherLead = await leadOwnedBy(intl.id);
      const res = await api()
        .patch(`${API}/leads/${otherLead.id}`)
        .set("Authorization", await authFor(SEEDED.crmDomestic))
        .send({ stage: "hot_lead" });
      expect(res.status).to.equal(404);
    });

    it("returns 400 for an empty patch", async () => {
      const res = await api()
        .patch(`${API}/leads/1`)
        .set("Authorization", await authFor(SEEDED.admin))
        .send({});
      expect(res.status).to.equal(400);
    });

    it("returns 404 for a missing lead", async () => {
      const res = await api()
        .patch(`${API}/leads/999999`)
        .set("Authorization", await authFor(SEEDED.admin))
        .send({ stage: "hot_lead" });
      expect(res.status).to.equal(404);
    });
  });
});
