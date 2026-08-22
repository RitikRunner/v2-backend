import { In } from "typeorm";
import { AppDataSource } from "../data-source";
import { User, UserRole, UserTeam } from "../entities/User";
import { AssignmentCursor } from "../entities/AssignmentCursor";
import { Lead } from "../entities/Lead";
import { LeadAssignment, AssignmentStatus } from "../entities/LeadAssignment";
import { Activity, ActivityType } from "../entities/Activity";
import { logger } from "../utils/logger";

const CRM_ELIGIBLE_ROLES: UserRole[] = [UserRole.CRM, UserRole.CONSULTANT];
const SLA_WINDOW_MS = 20 * 60 * 1000;

function eligibleTeamsForLead(lead: Lead): UserTeam[] {
  return lead.isInternational
    ? [UserTeam.BOTH, UserTeam.INTERNATIONAL]
    : [UserTeam.BOTH, UserTeam.DOMESTIC];
}

async function findHodForLead(lead: Lead): Promise<User | null> {
  const userRepo = AppDataSource.getRepository(User);
  return userRepo.findOne({
    where: {
      isActive: true,
      role: UserRole.HOD,
      team: In(eligibleTeamsForLead(lead)),
    },
    order: { id: "ASC" },
  });
}

async function persistAssignment(
  lead: Lead,
  assignee: User,
  actorUserId: number | null,
): Promise<void> {
  const leadRepo = AppDataSource.getRepository(Lead);
  const assignmentRepo = AppDataSource.getRepository(LeadAssignment);
  const activityRepo = AppDataSource.getRepository(Activity);

  const previousOwnerId = lead.ownerUserId ?? null;
  const now = new Date();
  lead.ownerUserId = assignee.id;
  lead.assignedAt = now;
  if (actorUserId) {
    lead.updatedByUserId = actorUserId;
  }
  await leadRepo.save(lead);

  const deadlineAt = new Date(now.getTime() + SLA_WINDOW_MS);
  await assignmentRepo.save(
    assignmentRepo.create({
      leadId: lead.id,
      assignedToUserId: assignee.id,
      assignedByUserId: actorUserId,
      assignedAt: now,
      deadlineAt,
      status: AssignmentStatus.PENDING,
    }),
  );

  await activityRepo.save(
    activityRepo.create({
      leadId: lead.id,
      userId: actorUserId,
      type: ActivityType.ASSIGNMENT,
      previousOwnerId,
      newOwnerId: assignee.id,
    }),
  );
}

export async function assignToHod(
  lead: Lead,
  actorUserId: number | null,
): Promise<User | null> {
  const hod = await findHodForLead(lead);

  if (!hod) {
    logger.warn(
      { leadId: lead.id },
      "No active HOD found for lead — assignment skipped",
    );
    return null;
  }

  await persistAssignment(lead, hod, actorUserId);

  return hod;
}

export async function assignLeadToConsultant(
  lead: Lead,
  actorUserId: number | null,
): Promise<User | null> {
  const userRepo = AppDataSource.getRepository(User);
  const cursorRepo = AppDataSource.getRepository(AssignmentCursor);

  const teams = eligibleTeamsForLead(lead);

  const candidates = await userRepo.find({
    where: {
      isCheckedIn: true,
      isActive: true,
      role: In(CRM_ELIGIBLE_ROLES),
      team: In(teams),
    },
    order: { lastCheckedInAt: "ASC" },
  });

  if (candidates.length === 0) {
    logger.info(
      { leadId: lead.id },
      "No checked-in CRM found — falling back to HOD",
    );
    return assignToHod(lead, actorUserId);
  }

  const teamKey = lead.isInternational
    ? UserTeam.INTERNATIONAL
    : UserTeam.DOMESTIC;

  let cursor = await cursorRepo.findOne({ where: { team: teamKey } });
  const lastId = cursor?.lastAssignedUserId ?? 0;

  const lastIndex = candidates.findIndex((c) => c.id === lastId);
  const nextIndex = lastIndex === -1 ? 0 : (lastIndex + 1) % candidates.length;
  const assignee = candidates[nextIndex];

  if (!cursor) {
    cursor = cursorRepo.create({ team: teamKey });
  }
  cursor.lastAssignedUserId = assignee.id;
  await cursorRepo.save(cursor);

  await persistAssignment(lead, assignee, actorUserId);

  return assignee;
}
