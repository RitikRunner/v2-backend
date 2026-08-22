import { Worker, Job } from "bullmq";
import { bullConnection } from "../config/redis";
import { logger } from "../utils/logger";
import { AppDataSource } from "../data-source";
import { LeadAssignment, AssignmentStatus } from "../entities/LeadAssignment";
import {
  assignLeadToConsultant,
  assignToHod,
} from "../services/assignment-service";
import { Activity, ActivityType } from "../entities/Activity";
import { LessThan } from "typeorm";

const MAX_TRANSFERS = 3;

export const slaWorker = new Worker(
  "slaQueue",
  async (job: Job) => {
    logger.info({ jobId: job.id }, "Running SLA check job");

    if (job.name === "check-sla") {
      const assignmentRepo = AppDataSource.getRepository(LeadAssignment);
      const activityRepo = AppDataSource.getRepository(Activity);
      const now = new Date();

      const breachedAssignments = await assignmentRepo.find({
        where: {
          status: AssignmentStatus.PENDING,
          deadlineAt: LessThan(now),
        },
        relations: { lead: true },
      });

      for (const assignment of breachedAssignments) {
        try {
          const fresh = await assignmentRepo.findOne({
            where: { id: assignment.id, status: AssignmentStatus.PENDING },
          });
          if (!fresh) {
            logger.info(
              { assignmentId: assignment.id },
              "SLA assignment already processed by concurrent run — skipping",
            );
            continue;
          }

          const lead = assignment.lead;
          const previousOwnerId = lead.ownerUserId;
          const transferCount = assignment.transferCount + 1;

          fresh.status = AssignmentStatus.MISSED;
          await assignmentRepo.save(fresh);

          if (transferCount >= MAX_TRANSFERS) {
            logger.info(
              { leadId: lead.id, transferCount },
              "SLA max transfers reached — escalating to HOD",
            );

            const hod = await assignToHod(lead, null);

            if (!hod) {
              logger.error(
                { leadId: lead.id },
                "CRITICAL: SLA escalation failed — no HOD found. Reverting assignment to PENDING so lead is not lost.",
              );
              fresh.status = AssignmentStatus.PENDING;
              await assignmentRepo.save(fresh);
              continue;
            }

            const newAssignment = await assignmentRepo.findOne({
              where: { leadId: lead.id, status: AssignmentStatus.PENDING },
              order: { createdAt: "DESC" },
            });
            if (newAssignment) {
              newAssignment.transferCount = transferCount;
              newAssignment.escalatedToHod = true;
              newAssignment.escalatedAt = new Date();
              await assignmentRepo.save(newAssignment);
            }

            await activityRepo.save(
              activityRepo.create({
                leadId: lead.id,
                userId: null,
                type: ActivityType.ASSIGNMENT,
                previousOwnerId: previousOwnerId,
                newOwnerId: hod.id,
              }),
            );
          } else {
            const newAssignee = await assignLeadToConsultant(lead, null);

            if (!newAssignee) {
              logger.error(
                { leadId: lead.id },
                "CRITICAL: SLA transfer failed — no assignee found. Reverting assignment to PENDING so lead is not lost.",
              );
              fresh.status = AssignmentStatus.PENDING;
              await assignmentRepo.save(fresh);
              continue;
            }

            const newAssignment = await assignmentRepo.findOne({
              where: { leadId: lead.id, status: AssignmentStatus.PENDING },
              order: { createdAt: "DESC" },
            });
            if (newAssignment) {
              newAssignment.transferCount = transferCount;
              await assignmentRepo.save(newAssignment);
            }

            await activityRepo.save(
              activityRepo.create({
                leadId: lead.id,
                userId: null,
                type: ActivityType.ASSIGNMENT,
                previousOwnerId: previousOwnerId,
                newOwnerId: newAssignee.id,
              }),
            );
          }
        } catch (error) {
          logger.error(
            { err: error, assignmentId: assignment.id },
            "Error processing breached SLA assignment",
          );
        }
      }
    }
  },
  { connection: bullConnection },
);

slaWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "SLA Worker Job Failed");
});
