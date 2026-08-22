import { expect } from "chai";
import { AppDataSource } from "../../data-source";
import { Lead, LeadChannel, LeadStage } from "../../entities/Lead";
import {
  LeadAssignment,
  AssignmentStatus,
} from "../../entities/LeadAssignment";
import { Activity, ActivityType } from "../../entities/Activity";
import { slaWorker } from "../../workers/sla-worker";
import { currentEncryptionKeyVersion } from "../../utils/encryption";
import { User, UserRole, UserTeam } from "../../entities/User";

const SLA_WINDOW_SECONDS_FOR_TEST = 20;

async function cleanupLead(leadId: number): Promise<void> {
  const activityRepo = AppDataSource.getRepository(Activity);
  const assignmentRepo = AppDataSource.getRepository(LeadAssignment);
  const leadRepo = AppDataSource.getRepository(Lead);
  await activityRepo.delete({ leadId });
  await assignmentRepo.delete({ leadId });
  await leadRepo.delete(leadId);
}

async function runSlaProcessor(): Promise<void> {
  const processor = (slaWorker as any).processFn;
  await processor({ name: "check-sla", id: "test-job" });
}

async function saveUser(overrides: Partial<User>): Promise<User> {
  const userRepo = AppDataSource.getRepository(User);
  return userRepo.save(userRepo.create(overrides));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("SLA Worker", () => {
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

  let hod: User;
  let preExistingHodIds: number[] = [];

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
      email: `sla.hod.${Date.now()}@test.com`,
      name: "SLA HOD",
      role: UserRole.HOD,
      team: UserTeam.DOMESTIC,
      isActive: true,
    });
  });

  after(async () => {
    const userRepo = AppDataSource.getRepository(User);
    await userRepo.delete(hod.id);
    if (preExistingHodIds.length > 0) {
      await userRepo.update(preExistingHodIds, { isActive: true });
    }
  });

  it("marks an overdue PENDING assignment as MISSED and creates a new one", async () => {
    const leadRepo = AppDataSource.getRepository(Lead);
    const assignmentRepo = AppDataSource.getRepository(LeadAssignment);
    const activityRepo = AppDataSource.getRepository(Activity);

    const lead = await leadRepo.save(
      leadRepo.create({
        name: "SLA-Miss-Lead",
        channel: LeadChannel.WEBSITE,
        stage: LeadStage.NEW_LEAD,
        isInternational: false,
        encKeyVersion: currentEncryptionKeyVersion,
        ownerUserId: hod.id,
      }),
    );

    const assignment = await assignmentRepo.save(
      assignmentRepo.create({
        leadId: lead.id,
        assignedToUserId: hod.id,
        assignedByUserId: null,
        deadlineAt: new Date(Date.now() - 1000),
        status: AssignmentStatus.PENDING,
        transferCount: 0,
      }),
    );

    await runSlaProcessor();

    const missed = await assignmentRepo.findOne({
      where: { id: assignment.id },
    });
    expect(missed!.status).to.equal(AssignmentStatus.MISSED);

    const newPending = await assignmentRepo.find({
      where: { leadId: lead.id, status: AssignmentStatus.PENDING },
    });
    expect(newPending.length).to.equal(1);
    expect(newPending[0].transferCount).to.equal(1);

    const log = await activityRepo.findOne({
      where: { leadId: lead.id, type: ActivityType.ASSIGNMENT },
      order: { createdAt: "DESC" },
    });
    expect(log).to.not.be.null;
    expect(log!.previousOwnerId).to.equal(hod.id);
    expect(log!.newOwnerId).to.equal(hod.id);

    await cleanupLead(lead.id);
  });

  it("escalates to HOD (not the next CRM in rotation) when MAX_TRANSFERS is reached", async () => {
    const leadRepo = AppDataSource.getRepository(Lead);
    const assignmentRepo = AppDataSource.getRepository(LeadAssignment);
    const activityRepo = AppDataSource.getRepository(Activity);
    const userRepo = AppDataSource.getRepository(User);

    const crm = await saveUser({
      email: `sla.escalation.crm.${Date.now()}@test.com`,
      name: "Escalation CRM",
      role: UserRole.CRM,
      team: UserTeam.DOMESTIC,
      isActive: true,
      isCheckedIn: true,
      lastCheckedInAt: new Date(),
    });

    const lead = await leadRepo.save(
      leadRepo.create({
        name: "Escalation-Lead",
        channel: LeadChannel.WEBSITE,
        stage: LeadStage.NEW_LEAD,
        isInternational: false,
        encKeyVersion: currentEncryptionKeyVersion,
        ownerUserId: crm.id,
      }),
    );

    await assignmentRepo.save(
      assignmentRepo.create({
        leadId: lead.id,
        assignedToUserId: crm.id,
        assignedByUserId: null,
        deadlineAt: new Date(Date.now() - 1000),
        status: AssignmentStatus.PENDING,
        transferCount: 2,
      }),
    );

    await runSlaProcessor();

    const updatedLead = await leadRepo.findOne({ where: { id: lead.id } });
    expect(updatedLead!.ownerUserId).to.equal(hod.id);

    const newPending = await assignmentRepo.findOne({
      where: { leadId: lead.id, status: AssignmentStatus.PENDING },
    });
    expect(newPending).to.not.be.null;
    expect(newPending!.escalatedToHod).to.be.true;
    expect(newPending!.escalatedAt).to.not.be.null;
    expect(newPending!.assignedToUserId).to.equal(hod.id);

    const escalationLog = await activityRepo.findOne({
      where: { leadId: lead.id, type: ActivityType.ASSIGNMENT },
      order: { createdAt: "DESC" },
    });
    expect(escalationLog!.newOwnerId).to.equal(hod.id);
    expect(escalationLog!.previousOwnerId).to.equal(crm.id);

    await cleanupLead(lead.id);
    await userRepo.delete(crm.id);
  });

  it("does not re-transfer a RESPONDED assignment", async () => {
    const leadRepo = AppDataSource.getRepository(Lead);
    const assignmentRepo = AppDataSource.getRepository(LeadAssignment);

    const lead = await leadRepo.save(
      leadRepo.create({
        name: "Responded-Lead",
        channel: LeadChannel.WEBSITE,
        stage: LeadStage.HOT_LEAD,
        isInternational: false,
        encKeyVersion: currentEncryptionKeyVersion,
        ownerUserId: hod.id,
      }),
    );

    await assignmentRepo.save(
      assignmentRepo.create({
        leadId: lead.id,
        assignedToUserId: hod.id,
        assignedByUserId: null,
        deadlineAt: new Date(Date.now() - 1000),
        status: AssignmentStatus.RESPONDED,
        respondedAt: new Date(),
        transferCount: 0,
      }),
    );

    await runSlaProcessor();

    const allAssignments = await assignmentRepo.find({
      where: { leadId: lead.id },
    });
    const pending = allAssignments.filter(
      (a) => a.status === AssignmentStatus.PENDING,
    );
    expect(pending.length).to.equal(0);

    const respondedAssignment = allAssignments.find(
      (a) => a.status === AssignmentStatus.RESPONDED,
    );
    expect(respondedAssignment).to.not.be.undefined;

    await cleanupLead(lead.id);
  });

  it("is idempotent — a duplicate job run does not create a second PENDING assignment", async () => {
    const leadRepo = AppDataSource.getRepository(Lead);
    const assignmentRepo = AppDataSource.getRepository(LeadAssignment);

    const lead = await leadRepo.save(
      leadRepo.create({
        name: "Idempotent-Lead",
        channel: LeadChannel.WEBSITE,
        stage: LeadStage.NEW_LEAD,
        isInternational: false,
        encKeyVersion: currentEncryptionKeyVersion,
        ownerUserId: hod.id,
      }),
    );

    await assignmentRepo.save(
      assignmentRepo.create({
        leadId: lead.id,
        assignedToUserId: hod.id,
        assignedByUserId: null,
        deadlineAt: new Date(Date.now() - 1000),
        status: AssignmentStatus.PENDING,
        transferCount: 0,
      }),
    );

    await runSlaProcessor();
    await runSlaProcessor();

    const pendingAssignments = await assignmentRepo.find({
      where: { leadId: lead.id, status: AssignmentStatus.PENDING },
    });
    expect(pendingAssignments.length).to.equal(1);

    await cleanupLead(lead.id);
  });

  it("keeps the lead with its existing owner when no HOD exists to handle escalation", async () => {
    const leadRepo = AppDataSource.getRepository(Lead);
    const assignmentRepo = AppDataSource.getRepository(LeadAssignment);
    const userRepo = AppDataSource.getRepository(User);

    await userRepo.update(hod.id, { isActive: false });

    const lead = await leadRepo.save(
      leadRepo.create({
        name: "NoHOD-Escalation-Lead",
        channel: LeadChannel.WEBSITE,
        stage: LeadStage.NEW_LEAD,
        isInternational: false,
        encKeyVersion: currentEncryptionKeyVersion,
        ownerUserId: hod.id,
      }),
    );

    await assignmentRepo.save(
      assignmentRepo.create({
        leadId: lead.id,
        assignedToUserId: hod.id,
        assignedByUserId: null,
        deadlineAt: new Date(Date.now() - 1000),
        status: AssignmentStatus.PENDING,
        transferCount: 2,
      }),
    );

    await runSlaProcessor();

    const allAssignments = await assignmentRepo.find({
      where: { leadId: lead.id },
    });
    const pendingAssignments = allAssignments.filter(
      (a) => a.status === AssignmentStatus.PENDING,
    );
    expect(pendingAssignments.length).to.equal(1);

    const updatedLead = await leadRepo.findOne({ where: { id: lead.id } });
    expect(updatedLead!.ownerUserId).to.equal(hod.id);

    await cleanupLead(lead.id);
    await userRepo.update(hod.id, { isActive: true });
  });

  it("processes all simultaneously breached leads in a single worker run", async () => {
    const leadRepo = AppDataSource.getRepository(Lead);
    const assignmentRepo = AppDataSource.getRepository(LeadAssignment);

    const leads = await Promise.all([
      leadRepo.save(
        leadRepo.create({
          name: "Bulk-1",
          channel: LeadChannel.WEBSITE,
          stage: LeadStage.NEW_LEAD,
          isInternational: false,
          encKeyVersion: currentEncryptionKeyVersion,
          ownerUserId: hod.id,
        }),
      ),
      leadRepo.save(
        leadRepo.create({
          name: "Bulk-2",
          channel: LeadChannel.WEBSITE,
          stage: LeadStage.NEW_LEAD,
          isInternational: false,
          encKeyVersion: currentEncryptionKeyVersion,
          ownerUserId: hod.id,
        }),
      ),
      leadRepo.save(
        leadRepo.create({
          name: "Bulk-3",
          channel: LeadChannel.WEBSITE,
          stage: LeadStage.NEW_LEAD,
          isInternational: false,
          encKeyVersion: currentEncryptionKeyVersion,
          ownerUserId: hod.id,
        }),
      ),
    ]);

    await Promise.all(
      leads.map((lead) =>
        assignmentRepo.save(
          assignmentRepo.create({
            leadId: lead.id,
            assignedToUserId: hod.id,
            assignedByUserId: null,
            deadlineAt: new Date(Date.now() - 1000),
            status: AssignmentStatus.PENDING,
            transferCount: 0,
          }),
        ),
      ),
    );

    await runSlaProcessor();

    for (const lead of leads) {
      const pending = await assignmentRepo.find({
        where: { leadId: lead.id, status: AssignmentStatus.PENDING },
      });
      expect(pending.length).to.equal(
        1,
        `Lead ${lead.name} should have exactly one new PENDING assignment`,
      );
      expect(pending[0].transferCount).to.equal(1);

      await cleanupLead(lead.id);
    }
  });

  it(`end-to-end: assignment created now is NOT breached immediately, but IS breached after ${SLA_WINDOW_SECONDS_FOR_TEST}s`, async function () {
    this.timeout((SLA_WINDOW_SECONDS_FOR_TEST + 5) * 1000);

    const leadRepo = AppDataSource.getRepository(Lead);
    const assignmentRepo = AppDataSource.getRepository(LeadAssignment);
    const crm = await saveUser({
      email: `sla.timing.crm.${Date.now()}@test.com`,
      name: "Timing CRM",
      role: UserRole.CRM,
      team: UserTeam.DOMESTIC,
      isActive: true,
      isCheckedIn: true,
      lastCheckedInAt: new Date(),
    });

    const lead = await leadRepo.save(
      leadRepo.create({
        name: "Timing-Lead",
        channel: LeadChannel.WEBSITE,
        stage: LeadStage.NEW_LEAD,
        isInternational: false,
        encKeyVersion: currentEncryptionKeyVersion,
        ownerUserId: crm.id,
      }),
    );

    const windowMs = SLA_WINDOW_SECONDS_FOR_TEST * 1000;
    const assignment = await assignmentRepo.save(
      assignmentRepo.create({
        leadId: lead.id,
        assignedToUserId: crm.id,
        assignedByUserId: null,
        deadlineAt: new Date(Date.now() + windowMs),
        status: AssignmentStatus.PENDING,
        transferCount: 0,
      }),
    );

    await runSlaProcessor();

    const notBreachedYet = await assignmentRepo.findOne({
      where: { id: assignment.id },
    });
    expect(notBreachedYet!.status).to.equal(
      AssignmentStatus.PENDING,
      "Assignment should still be PENDING before the deadline passes",
    );

    await sleep(windowMs + 1000);

    await runSlaProcessor();

    const nowBreached = await assignmentRepo.findOne({
      where: { id: assignment.id },
    });
    expect(nowBreached!.status).to.equal(
      AssignmentStatus.MISSED,
      "Assignment should be MISSED after the deadline has passed",
    );

    const newPending = await assignmentRepo.find({
      where: { leadId: lead.id, status: AssignmentStatus.PENDING },
    });
    expect(newPending.length).to.equal(1);

    await cleanupLead(lead.id);
    await AppDataSource.getRepository(User).delete(crm.id);
  });
});
