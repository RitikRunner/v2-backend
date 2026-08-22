import { expect } from "chai";
import { AppDataSource } from "../../data-source";
import { User, UserRole, UserTeam } from "../../entities/User";
import { Lead, LeadChannel, LeadStage } from "../../entities/Lead";
import { AssignmentCursor } from "../../entities/AssignmentCursor";
import { LeadAssignment } from "../../entities/LeadAssignment";
import { Activity, ActivityType } from "../../entities/Activity";
import {
  assignLeadToConsultant,
  assignToHod,
} from "../../services/assignment-service";
import { currentEncryptionKeyVersion } from "../../utils/encryption";

async function cleanupLead(leadId: number): Promise<void> {
  const activityRepo = AppDataSource.getRepository(Activity);
  const assignmentRepo = AppDataSource.getRepository(LeadAssignment);
  const leadRepo = AppDataSource.getRepository(Lead);
  await activityRepo.delete({ leadId });
  await assignmentRepo.delete({ leadId });
  await leadRepo.delete(leadId);
}

function makeLead(overrides: Partial<Lead> = {}): Partial<Lead> {
  return {
    channel: LeadChannel.WEBSITE,
    stage: LeadStage.NEW_LEAD,
    isInternational: false,
    encKeyVersion: currentEncryptionKeyVersion,
    ...overrides,
  };
}

async function saveUser(overrides: Partial<User>): Promise<User> {
  const userRepo = AppDataSource.getRepository(User);
  return userRepo.save(userRepo.create(overrides));
}

describe("Assignment Service", () => {
  let previouslyActiveUserIds: number[] = [];

  before(async () => {
    const userRepo = AppDataSource.getRepository(User);
    const activeUsers = await userRepo.find({ where: { isActive: true } });
    previouslyActiveUserIds = activeUsers.map((u) => u.id);
    if (previouslyActiveUserIds.length > 0) {
      await userRepo.update(previouslyActiveUserIds, { isActive: false });
    }
  });

  after(async () => {
    const userRepo = AppDataSource.getRepository(User);
    if (previouslyActiveUserIds.length > 0) {
      await userRepo.update(previouslyActiveUserIds, { isActive: true });
    }
  });

  describe("Round Robin — 2 CRMs", () => {
    let crm1: User;
    let crm2: User;
    let hod: User;

    before(async () => {
      const ts = Date.now();
      hod = await saveUser({
        email: `rr2.hod.${ts}@test.com`,
        name: "HOD 2CRM",
        role: UserRole.HOD,
        team: UserTeam.DOMESTIC,
        isActive: true,
      });
      crm1 = await saveUser({
        email: `rr2.crm1.${ts}@test.com`,
        name: "CRM 1",
        role: UserRole.CRM,
        team: UserTeam.DOMESTIC,
        isActive: true,
        isCheckedIn: true,
        lastCheckedInAt: new Date(Date.now() - 10000),
      });
      crm2 = await saveUser({
        email: `rr2.crm2.${ts}@test.com`,
        name: "CRM 2",
        role: UserRole.CRM,
        team: UserTeam.DOMESTIC,
        isActive: true,
        isCheckedIn: true,
        lastCheckedInAt: new Date(Date.now() - 5000),
      });
    });

    after(async () => {
      const userRepo = AppDataSource.getRepository(User);
      await userRepo.delete([crm1.id, crm2.id, hod.id]);
      await AppDataSource.getRepository(AssignmentCursor).delete({
        team: UserTeam.DOMESTIC,
      });
    });

    it("assigns the first lead to the oldest checked-in CRM", async () => {
      const leadRepo = AppDataSource.getRepository(Lead);
      const lead = await leadRepo.save(
        leadRepo.create(makeLead({ name: "RR-Lead-1" })),
      );

      const assignee = await assignLeadToConsultant(lead, null);

      expect(assignee).to.not.be.null;
      expect(assignee!.id).to.equal(crm1.id);
      const assignment = await AppDataSource.getRepository(
        LeadAssignment,
      ).findOne({ where: { leadId: lead.id } });
      expect(assignment!.assignedToUserId).to.equal(crm1.id);

      await cleanupLead(lead.id);
    });

    it("assigns the second lead to CRM2 (round robin)", async () => {
      const leadRepo = AppDataSource.getRepository(Lead);
      const lead = await leadRepo.save(
        leadRepo.create(makeLead({ name: "RR-Lead-2" })),
      );

      const assignee = await assignLeadToConsultant(lead, null);

      expect(assignee!.id).to.equal(crm2.id);
      await cleanupLead(lead.id);
    });

    it("falls back to HOD when no CRMs are checked in", async () => {
      const userRepo = AppDataSource.getRepository(User);
      await userRepo.update(crm1.id, { isCheckedIn: false });
      await userRepo.update(crm2.id, { isCheckedIn: false });

      const leadRepo = AppDataSource.getRepository(Lead);
      const lead = await leadRepo.save(
        leadRepo.create(makeLead({ name: "HOD-Fallback-Lead" })),
      );

      const assignee = await assignLeadToConsultant(lead, null);

      expect(assignee).to.not.be.null;
      expect(assignee!.role).to.equal(UserRole.HOD);
      await cleanupLead(lead.id);
    });
  });

  describe("Round Robin — 3 CRMs cursor wrap-around", () => {
    let crm1: User;
    let crm2: User;
    let crm3: User;
    const ts = Date.now() + 1;

    before(async () => {
      crm1 = await saveUser({
        email: `rr3.crm1.${ts}@test.com`,
        name: "CRM A",
        role: UserRole.CRM,
        team: UserTeam.DOMESTIC,
        isActive: true,
        isCheckedIn: true,
        lastCheckedInAt: new Date(Date.now() - 30000),
      });
      crm2 = await saveUser({
        email: `rr3.crm2.${ts}@test.com`,
        name: "CRM B",
        role: UserRole.CRM,
        team: UserTeam.DOMESTIC,
        isActive: true,
        isCheckedIn: true,
        lastCheckedInAt: new Date(Date.now() - 20000),
      });
      crm3 = await saveUser({
        email: `rr3.crm3.${ts}@test.com`,
        name: "CRM C",
        role: UserRole.CRM,
        team: UserTeam.DOMESTIC,
        isActive: true,
        isCheckedIn: true,
        lastCheckedInAt: new Date(Date.now() - 10000),
      });
      await AppDataSource.getRepository(AssignmentCursor).delete({
        team: UserTeam.DOMESTIC,
      });
    });

    after(async () => {
      const userRepo = AppDataSource.getRepository(User);
      await userRepo.delete([crm1.id, crm2.id, crm3.id]);
      await AppDataSource.getRepository(AssignmentCursor).delete({
        team: UserTeam.DOMESTIC,
      });
    });

    it("wraps the cursor back to CRM1 after cycling through all 3", async () => {
      const leadRepo = AppDataSource.getRepository(Lead);

      const order: number[] = [];
      for (let i = 1; i <= 4; i++) {
        const lead = await leadRepo.save(
          leadRepo.create(makeLead({ name: `Wrap-Lead-${i}` })),
        );
        const assignee = await assignLeadToConsultant(lead, null);
        order.push(assignee!.id);
        await cleanupLead(lead.id);
      }

      expect(order[0]).to.equal(crm1.id);
      expect(order[1]).to.equal(crm2.id);
      expect(order[2]).to.equal(crm3.id);
      expect(order[3]).to.equal(crm1.id);
    });
  });

  describe("Cursor drift — CRM checks out after being last assigned", () => {
    let crm1: User;
    let crm2: User;
    const ts = Date.now() + 2;

    before(async () => {
      crm1 = await saveUser({
        email: `drift.crm1.${ts}@test.com`,
        name: "Drift CRM1",
        role: UserRole.CRM,
        team: UserTeam.DOMESTIC,
        isActive: true,
        isCheckedIn: true,
        lastCheckedInAt: new Date(Date.now() - 20000),
      });
      crm2 = await saveUser({
        email: `drift.crm2.${ts}@test.com`,
        name: "Drift CRM2",
        role: UserRole.CRM,
        team: UserTeam.DOMESTIC,
        isActive: true,
        isCheckedIn: true,
        lastCheckedInAt: new Date(Date.now() - 10000),
      });
      await AppDataSource.getRepository(AssignmentCursor).delete({
        team: UserTeam.DOMESTIC,
      });
    });

    after(async () => {
      const userRepo = AppDataSource.getRepository(User);
      await userRepo.delete([crm1.id, crm2.id]);
      await AppDataSource.getRepository(AssignmentCursor).delete({
        team: UserTeam.DOMESTIC,
      });
    });

    it("skips the checked-out last-assigned CRM and assigns to the next available", async () => {
      const leadRepo = AppDataSource.getRepository(Lead);
      const userRepo = AppDataSource.getRepository(User);

      const lead1 = await leadRepo.save(
        leadRepo.create(makeLead({ name: "Drift-Lead-1" })),
      );
      await assignLeadToConsultant(lead1, null);
      await cleanupLead(lead1.id);

      await userRepo.update(crm1.id, { isCheckedIn: false });

      const lead2 = await leadRepo.save(
        leadRepo.create(makeLead({ name: "Drift-Lead-2" })),
      );
      const assignee = await assignLeadToConsultant(lead2, null);

      expect(assignee).to.not.be.null;
      expect(assignee!.id).to.not.equal(crm1.id);
      expect(assignee!.id).to.equal(crm2.id);

      await cleanupLead(lead2.id);
    });
  });

  describe("International lead routing", () => {
    let domesticCrm: User;
    let intlCrm: User;
    let bothCrm: User;
    const ts = Date.now() + 3;

    before(async () => {
      domesticCrm = await saveUser({
        email: `intl.domestic.${ts}@test.com`,
        name: "Domestic CRM",
        role: UserRole.CRM,
        team: UserTeam.DOMESTIC,
        isActive: true,
        isCheckedIn: true,
        lastCheckedInAt: new Date(Date.now() - 30000),
      });
      intlCrm = await saveUser({
        email: `intl.intl.${ts}@test.com`,
        name: "Intl CRM",
        role: UserRole.CRM,
        team: UserTeam.INTERNATIONAL,
        isActive: true,
        isCheckedIn: true,
        lastCheckedInAt: new Date(Date.now() - 20000),
      });
      bothCrm = await saveUser({
        email: `intl.both.${ts}@test.com`,
        name: "Both CRM",
        role: UserRole.CRM,
        team: UserTeam.BOTH,
        isActive: true,
        isCheckedIn: true,
        lastCheckedInAt: new Date(Date.now() - 10000),
      });
      await AppDataSource.getRepository(AssignmentCursor).delete({
        team: UserTeam.INTERNATIONAL,
      });
    });

    after(async () => {
      const userRepo = AppDataSource.getRepository(User);
      await userRepo.delete([domesticCrm.id, intlCrm.id, bothCrm.id]);
      await AppDataSource.getRepository(AssignmentCursor).delete({
        team: UserTeam.INTERNATIONAL,
      });
    });

    it("routes an international lead only to INTERNATIONAL or BOTH team CRMs", async () => {
      const leadRepo = AppDataSource.getRepository(Lead);

      const assignees: number[] = [];
      for (let i = 1; i <= 3; i++) {
        const lead = await leadRepo.save(
          leadRepo.create(
            makeLead({ name: `Intl-Lead-${i}`, isInternational: true }),
          ),
        );
        const assignee = await assignLeadToConsultant(lead, null);
        expect(assignee).to.not.be.null;
        expect(assignee!.id).to.not.equal(domesticCrm.id);
        assignees.push(assignee!.id);
        await cleanupLead(lead.id);
      }

      expect(assignees).to.include(intlCrm.id);
      expect(assignees).to.include(bothCrm.id);
    });
  });

  describe("assignToHod", () => {
    let hod: User;
    let crm: User;
    let preExistingHodIds: number[] = [];
    const ts = Date.now() + 4;

    before(async () => {
      const userRepo = AppDataSource.getRepository(User);

      const existingHods = await userRepo.find({
        where: { role: UserRole.HOD, isActive: true },
      });
      preExistingHodIds = existingHods.map((u) => u.id);
      if (preExistingHodIds.length > 0) {
        await userRepo.update(preExistingHodIds, { isActive: false });
      }

      hod = await saveUser({
        email: `hod.direct.${ts}@test.com`,
        name: "Direct HOD",
        role: UserRole.HOD,
        team: UserTeam.DOMESTIC,
        isActive: true,
      });
      crm = await saveUser({
        email: `hod.crm.${ts}@test.com`,
        name: "Online CRM",
        role: UserRole.CRM,
        team: UserTeam.DOMESTIC,
        isActive: true,
        isCheckedIn: true,
        lastCheckedInAt: new Date(),
      });
    });

    after(async () => {
      const userRepo = AppDataSource.getRepository(User);
      await userRepo.delete([hod.id, crm.id]);
      if (preExistingHodIds.length > 0) {
        await userRepo.update(preExistingHodIds, { isActive: true });
      }
    });

    it("assigns directly to HOD even when CRMs are available", async () => {
      const leadRepo = AppDataSource.getRepository(Lead);
      const lead = await leadRepo.save(
        leadRepo.create(makeLead({ name: "Direct-HOD-Lead" })),
      );

      const assignee = await assignToHod(lead, null);

      expect(assignee).to.not.be.null;
      expect(assignee!.id).to.equal(hod.id);

      const assignment = await AppDataSource.getRepository(
        LeadAssignment,
      ).findOne({ where: { leadId: lead.id } });
      expect(assignment!.assignedToUserId).to.equal(hod.id);

      const updatedLead = await leadRepo.findOne({ where: { id: lead.id } });
      expect(updatedLead!.ownerUserId).to.equal(hod.id);

      await cleanupLead(lead.id);
    });

    it("returns null and does not create an assignment when no HOD exists", async () => {
      const userRepo = AppDataSource.getRepository(User);
      await userRepo.update(hod.id, { isActive: false });

      const leadRepo = AppDataSource.getRepository(Lead);
      const lead = await leadRepo.save(
        leadRepo.create(makeLead({ name: "No-HOD-Lead" })),
      );

      const assignee = await assignToHod(lead, null);

      expect(assignee).to.be.null;

      const assignment = await AppDataSource.getRepository(
        LeadAssignment,
      ).findOne({ where: { leadId: lead.id } });
      expect(assignment).to.be.null;

      await cleanupLead(lead.id);
      await userRepo.update(hod.id, { isActive: true });
    });
  });

  describe("CONSULTANT role receives leads like a CRM", () => {
    let consultant: User;
    let hod: User;
    const ts = Date.now() + 5;

    before(async () => {
      consultant = await saveUser({
        email: `consultant.${ts}@test.com`,
        name: "Dental Consultant",
        role: UserRole.CONSULTANT,
        team: UserTeam.DOMESTIC,
        isActive: true,
        isCheckedIn: true,
        lastCheckedInAt: new Date(),
      });
      hod = await saveUser({
        email: `consultant.hod.${ts}@test.com`,
        name: "Consultant HOD",
        role: UserRole.HOD,
        team: UserTeam.DOMESTIC,
        isActive: true,
      });
    });

    after(async () => {
      const userRepo = AppDataSource.getRepository(User);
      await userRepo.delete([consultant.id, hod.id]);
      await AppDataSource.getRepository(AssignmentCursor).delete({
        team: UserTeam.DOMESTIC,
      });
    });

    it("includes CONSULTANT in round-robin alongside CRMs", async () => {
      const leadRepo = AppDataSource.getRepository(Lead);
      const lead = await leadRepo.save(
        leadRepo.create(makeLead({ name: "Consultant-Lead" })),
      );

      const assignee = await assignLeadToConsultant(lead, null);

      expect(assignee).to.not.be.null;
      expect(assignee!.id).to.equal(consultant.id);
      expect(assignee!.role).to.equal(UserRole.CONSULTANT);

      await cleanupLead(lead.id);
    });
  });

  describe("BOTH team CRM handles domestic leads", () => {
    let bothCrm: User;
    const ts = Date.now() + 6;

    before(async () => {
      bothCrm = await saveUser({
        email: `both.domestic.${ts}@test.com`,
        name: "Both CRM",
        role: UserRole.CRM,
        team: UserTeam.BOTH,
        isActive: true,
        isCheckedIn: true,
        lastCheckedInAt: new Date(),
      });
      await AppDataSource.getRepository(AssignmentCursor).delete({
        team: UserTeam.DOMESTIC,
      });
    });

    after(async () => {
      await AppDataSource.getRepository(User).delete(bothCrm.id);
      await AppDataSource.getRepository(AssignmentCursor).delete({
        team: UserTeam.DOMESTIC,
      });
    });

    it("assigns a domestic lead to a BOTH-team CRM when no DOMESTIC-only CRM exists", async () => {
      const leadRepo = AppDataSource.getRepository(Lead);
      const lead = await leadRepo.save(
        leadRepo.create(makeLead({ name: "Both-Team-Domestic-Lead" })),
      );

      const assignee = await assignLeadToConsultant(lead, null);

      expect(assignee).to.not.be.null;
      expect(assignee!.id).to.equal(bothCrm.id);

      await cleanupLead(lead.id);
    });
  });

  describe("persistAssignment output — lead and assignment fields", () => {
    let crm: User;
    let hod: User;
    const ts = Date.now() + 7;

    before(async () => {
      crm = await saveUser({
        email: `persist.crm.${ts}@test.com`,
        name: "Persist CRM",
        role: UserRole.CRM,
        team: UserTeam.DOMESTIC,
        isActive: true,
        isCheckedIn: true,
        lastCheckedInAt: new Date(),
      });
      hod = await saveUser({
        email: `persist.hod.${ts}@test.com`,
        name: "Persist HOD",
        role: UserRole.HOD,
        team: UserTeam.DOMESTIC,
        isActive: true,
      });
      await AppDataSource.getRepository(AssignmentCursor).delete({
        team: UserTeam.DOMESTIC,
      });
    });

    after(async () => {
      await AppDataSource.getRepository(User).delete([crm.id, hod.id]);
      await AppDataSource.getRepository(AssignmentCursor).delete({
        team: UserTeam.DOMESTIC,
      });
    });

    it("sets assignedAt on the lead after assignment", async () => {
      const leadRepo = AppDataSource.getRepository(Lead);
      const before = new Date();

      const lead = await leadRepo.save(
        leadRepo.create(makeLead({ name: "AssignedAt-Lead" })),
      );

      await assignLeadToConsultant(lead, null);

      const updated = await leadRepo.findOne({ where: { id: lead.id } });
      expect(updated!.assignedAt).to.not.be.null;
      expect(updated!.assignedAt!.getTime()).to.be.greaterThanOrEqual(
        before.getTime(),
      );

      await cleanupLead(lead.id);
    });

    it("sets deadlineAt to approximately now + 20 minutes on the created assignment", async () => {
      const leadRepo = AppDataSource.getRepository(Lead);
      const assignmentRepo = AppDataSource.getRepository(LeadAssignment);
      const before = new Date();
      const TWENTY_MIN_MS = 20 * 60 * 1000;
      const TOLERANCE_MS = 3000;

      const lead = await leadRepo.save(
        leadRepo.create(makeLead({ name: "Deadline-Lead" })),
      );

      await assignLeadToConsultant(lead, null);

      const assignment = await assignmentRepo.findOne({
        where: { leadId: lead.id },
      });
      expect(assignment).to.not.be.null;

      const expectedDeadline = before.getTime() + TWENTY_MIN_MS;
      const actualDeadline = assignment!.deadlineAt.getTime();
      expect(actualDeadline).to.be.within(
        expectedDeadline - TOLERANCE_MS,
        expectedDeadline + TOLERANCE_MS,
        "deadlineAt should be approximately now + 20 minutes",
      );

      await cleanupLead(lead.id);
    });

    it("creates an activity log with the correct newOwnerId on initial assignment", async () => {
      const leadRepo = AppDataSource.getRepository(Lead);
      const activityRepo = AppDataSource.getRepository(Activity);

      const lead = await leadRepo.save(
        leadRepo.create(makeLead({ name: "Activity-Log-Lead" })),
      );

      await assignLeadToConsultant(lead, null);

      const activity = await activityRepo.findOne({
        where: { leadId: lead.id, type: ActivityType.ASSIGNMENT },
      });
      expect(activity).to.not.be.null;
      expect(activity!.newOwnerId).to.equal(crm.id);

      await cleanupLead(lead.id);
    });
  });
});
