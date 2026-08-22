import { expect } from "chai";
import { api, API } from "../support/app";
import { AppDataSource } from "../../data-source";
import { User, UserRole, UserTeam } from "../../entities/User";
import { Lead, LeadStage, LeadChannel } from "../../entities/Lead";
import { SEEDED, getUser, bearer } from "../support/fixtures";
import * as tokenService from "../../services/token-service";

describe("Helper APIs Integration Tests", () => {
  let admin: User;
  let adminToken: string;
  let crm: User;
  let crmToken: string;

  before(async () => {
    admin = await getUser(SEEDED.admin);
    const adminTokens = await tokenService.issueTokensForUser(admin);
    adminToken = adminTokens.accessToken;

    crm = await getUser(SEEDED.crmDomestic);
    const crmTokens = await tokenService.issueTokensForUser(crm);
    crmToken = crmTokens.accessToken;
  });

  describe("GET /users/me", () => {
    it("should return the current user profile with attendance stats", async () => {
      const res = await api()
        .get(`${API}/users/me`)
        .set("Authorization", `Bearer ${crmToken}`)
        .expect(200);

      expect(res.body).to.have.property("id", crm.id);
      expect(res.body).to.have.property("email", crm.email);
      expect(res.body).to.have.property("role", crm.role);
      expect(res.body).to.have.property("isCheckedIn");
      expect(res.body).to.have.property("todayTotalDurationSeconds");
      expect(res.body).to.have.property("activeSessionStart");
    });

    it("should reject unauthenticated requests", async () => {
      await api().get(`${API}/users/me`).expect(401);
    });
  });

  describe("GET /users/consultants", () => {
    it("should return a list of consultants for an admin", async () => {
      const res = await api()
        .get(`${API}/users/consultants`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).to.be.an("array");
      // crmDomestic is seeded with role CRM, so they should be in the list
      const foundCrm = res.body.find((u: any) => u.email === crm.email);
      expect(foundCrm).to.exist;
      expect(foundCrm).to.have.property("isCheckedIn");
      expect(foundCrm).to.not.have.property("password"); // Make sure sensitive info is excluded
    });

    it("should reject requests from non-managers (e.g., normal CRM)", async () => {
      await api()
        .get(`${API}/users/consultants`)
        .set("Authorization", `Bearer ${crmToken}`)
        .expect(403);
    });
  });

  describe("GET /metadata/enums", () => {
    it("should return all system enums", async () => {
      const res = await api()
        .get(`${API}/metadata/enums`)
        .set("Authorization", `Bearer ${crmToken}`)
        .expect(200);

      expect(res.body).to.have.property("UserRole");
      expect(res.body).to.have.property("LeadStage");
      expect(res.body).to.have.property("ActivityType");
      expect(res.body.UserRole).to.include("admin");
      expect(res.body.LeadStage).to.include("new_lead");
    });
  });

  describe("GET /stats/dashboard", () => {
    it("should return structured dashboard stats", async () => {
      const res = await api()
        .get(`${API}/stats/dashboard`)
        .set("Authorization", `Bearer ${crmToken}`)
        .expect(200);

      expect(res.body).to.have.property("insights");
      expect(res.body.insights)
        .to.have.property("newLeads")
        .that.is.a("number");

      expect(res.body).to.have.property("tat");
      expect(res.body.tat).to.have.property("delayedTasks").that.is.a("number");

      expect(res.body).to.have.property("leadOverview");
      expect(res.body.leadOverview)
        .to.have.property("allotted")
        .that.is.a("number");

      expect(res.body).to.have.property("stageOverview");
      expect(res.body.stageOverview).to.not.have.property("new_lead"); // keys are mapped, e.g. interested
      expect(res.body.stageOverview)
        .to.have.property("hotLead")
        .that.is.a("number");

      expect(res.body).to.have.property("consultation");
      expect(res.body.consultation)
        .to.have.property("totalBooked")
        .that.is.a("number");
    });
  });

  describe("GET /leads/:id/owner", () => {
    let lead: Lead;

    before(async () => {
      const leadRepo = AppDataSource.getRepository(Lead);
      lead = leadRepo.create({
        name: "Helper Test Lead",
        channel: LeadChannel.WEBSITE,
        stage: LeadStage.NEW_LEAD,
        ownerUserId: crm.id,
      });
      lead = await leadRepo.save(lead);
    });

    after(async () => {
      await AppDataSource.getRepository(Lead).delete(lead.id);
    });

    it("should return the owner details for a lead", async () => {
      const res = await api()
        .get(`${API}/leads/${lead.id}/owner`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      // Since the API returns { owner: { ... } } or just the user directly?
      // The test failure said: expected { owner: { id: 7, ... } } to have property 'id'
      expect(res.body).to.have.property("owner");
      expect(res.body.owner).to.have.property("id", crm.id);
      expect(res.body.owner).to.have.property("email", crm.email);
      expect(res.body.owner).to.have.property("name", crm.name);
      expect(res.body.owner).to.not.have.property("password");
    });

    it("should return null/404 or empty if lead not found", async () => {
      await api()
        .get(`${API}/leads/999999/owner`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
