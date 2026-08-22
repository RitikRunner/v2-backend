import { expect } from "chai";
import { AppDataSource } from "../../data-source";
import { Lead, LeadChannel, LeadStage } from "../../entities/Lead";
import { Activity, ActivityType } from "../../entities/Activity";
import { User, UserRole, UserTeam } from "../../entities/User";
import {
  currentEncryptionKeyVersion,
  encryptPersonalData,
} from "../../utils/encryption";
import { bearer } from "../support/fixtures";
import { api, API } from "../support/app";

describe("Lead Controller Endpoints (Timeline & Pending)", () => {
  let crmUser: User;
  let token: string;

  before(async () => {
    const userRepo = AppDataSource.getRepository(User);
    crmUser = await userRepo.save(
      userRepo.create({
        email: `endpoint.crm.${Date.now()}@test.com`,
        name: "Endpoint CRM",
        role: UserRole.CRM,
        team: UserTeam.DOMESTIC,
        isActive: true,
      }),
    );
    token = bearer(crmUser);
  });

  after(async () => {
    await AppDataSource.getRepository(User).delete(crmUser.id);
  });

  describe("GET /leads/follow-up", () => {
    it("should return only active follow up leads", async () => {
      const leadRepo = AppDataSource.getRepository(Lead);

      const l1 = await leadRepo.save(
        leadRepo.create({
          name: "Interested Lead",
          channel: LeadChannel.WEBSITE,
          stage: LeadStage.INTERESTED,
          isInternational: false,
          encKeyVersion: currentEncryptionKeyVersion,
          ownerUserId: crmUser.id,
        }),
      );

      const l2 = await leadRepo.save(
        leadRepo.create({
          name: "Junk Lead",
          channel: LeadChannel.WEBSITE,
          stage: LeadStage.JUNK,
          isInternational: false,
          encKeyVersion: currentEncryptionKeyVersion,
          ownerUserId: crmUser.id,
        }),
      );

      const res = await api()
        .get(`${API}/leads/follow-up`)
        .set("Authorization", token);

      expect(res.status).to.equal(200);
      const items = res.body.items;

      expect(items.some((i: any) => i.id === l1.id)).to.be.true;
      expect(items.some((i: any) => i.id === l2.id)).to.be.false;

      await leadRepo.delete([l1.id, l2.id]);
    });
  });

  describe("GET /leads/pending-tasks", () => {
    it("should return leads requiring action (e.g., whatsapp not called)", async () => {
      const leadRepo = AppDataSource.getRepository(Lead);

      const lead = await leadRepo.save(
        leadRepo.create({
          name: "Pending Lead",
          channel: LeadChannel.WEBSITE,
          stage: LeadStage.HOT_LEAD,
          isInternational: false,
          whatsappNumberEnc: encryptPersonalData("+919899990000"),
          isWhatsappMessaged: false,
          encKeyVersion: currentEncryptionKeyVersion,
          ownerUserId: crmUser.id,
        }),
      );

      const res = await api()
        .get(`${API}/leads/pending-tasks`)
        .set("Authorization", token);

      expect(res.status).to.equal(200);
      const items = res.body.items;

      const found = items.find((i: any) => i.id === lead.id);
      expect(found).to.not.be.undefined;
      expect(found.pendingActions).to.include("whatsapp_required");

      await leadRepo.delete(lead.id);
    });
  });

  describe("GET /leads/:id/timeline", () => {
    it("should return activities chronologically", async () => {
      const leadRepo = AppDataSource.getRepository(Lead);
      const activityRepo = AppDataSource.getRepository(Activity);

      const lead = await leadRepo.save(
        leadRepo.create({
          name: "Timeline Lead",
          channel: LeadChannel.WEBSITE,
          stage: LeadStage.NEW_LEAD,
          isInternational: false,
          encKeyVersion: currentEncryptionKeyVersion,
          ownerUserId: crmUser.id,
        }),
      );

      await activityRepo.save([
        activityRepo.create({
          leadId: lead.id,
          userId: crmUser.id,
          type: ActivityType.ASSIGNMENT,
          subject: "A",
          createdAt: new Date("2026-01-01T10:00"),
        }),
        activityRepo.create({
          leadId: lead.id,
          userId: crmUser.id,
          type: ActivityType.STATUS_CHANGE,
          subject: "B",
          createdAt: new Date("2026-01-01T10:05"),
        }),
      ]);

      const res = await api()
        .get(`${API}/leads/${lead.id}/timeline`)
        .set("Authorization", token);

      expect(res.status).to.equal(200);
      expect(res.body.timeline.length).to.equal(2);
      expect(res.body.timeline[0].subject).to.equal("A");
      expect(res.body.timeline[1].subject).to.equal("B");

      // Clean up
      await activityRepo.delete({ leadId: lead.id });
      await leadRepo.delete(lead.id);
    });
  });
});
