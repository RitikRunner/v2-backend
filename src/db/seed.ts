import "reflect-metadata";
import { AppDataSource } from "../data-source";
import { Branch } from "../entities/Branch";
import { Doctor } from "../entities/Doctor";
import { DoctorBranch } from "../entities/DoctorBranch";
import { DoctorAvailability } from "../entities/DoctorAvailability";
import { AssignmentCursor } from "../entities/AssignmentCursor";
import { Lead, LeadChannel, LeadStage } from "../entities/Lead";
import { User, UserRole, UserTeam } from "../entities/User";
import {
  computeBlindIndex,
  currentEncryptionKeyVersion,
  encryptPersonalData,
} from "../utils/encryption";
import { normalizeEmail, normalizePhone } from "../utils/normalize";
import { logger } from "../utils/logger";
import { env } from "../config/env";

async function seedBranches(): Promise<Record<string, Branch>> {
  const repo = AppDataSource.getRepository(Branch);
  const wanted = [
    {
      code: "GK",
      name: "Stunning Dentistry — Greater Kailash",
      city: "New Delhi",
      state: "Delhi",
    },
    {
      code: "NSP",
      name: "Stunning Dentistry — Netaji Subhash Place",
      city: "New Delhi",
      state: "Delhi",
    },
  ];
  const byCode: Record<string, Branch> = {};
  for (const b of wanted) {
    byCode[b.code] =
      (await repo.findOne({ where: { code: b.code } })) ??
      (await repo.save(repo.create(b)));
  }
  return byCode;
}

async function seedDoctors(branches: Record<string, Branch>): Promise<void> {
  const doctors = AppDataSource.getRepository(Doctor);
  const doctorBranches = AppDataSource.getRepository(DoctorBranch);
  const availability = AppDataSource.getRepository(DoctorAvailability);
  const wanted = [
    {
      name: "Dr. Meera Sharma",
      specialty: "Orthodontics",
      primary: "GK",
      branches: ["GK", "NSP"],
    },
    {
      name: "Dr. Arjun Rao",
      specialty: "Implantology",
      primary: "NSP",
      branches: ["NSP"],
    },
  ];
  for (const d of wanted) {
    const doctor =
      (await doctors.findOne({ where: { name: d.name } })) ??
      (await doctors.save(
        doctors.create({
          name: d.name,
          specialty: d.specialty,
          primaryBranchId: branches[d.primary].id,
        }),
      ));

    for (const code of d.branches) {
      const link = await doctorBranches.findOne({
        where: { doctorId: doctor.id, branchId: branches[code].id },
      });
      if (!link) {
        await doctorBranches.save(
          doctorBranches.create({
            doctorId: doctor.id,
            branchId: branches[code].id,
          }),
        );
      }
    }

    for (let day = 1; day <= 6; day++) {
      const slot = await availability.findOne({
        where: {
          doctorId: doctor.id,
          branchId: branches[d.primary].id,
          dayOfWeek: day,
        },
      });
      if (!slot) {
        await availability.save(
          availability.create({
            doctorId: doctor.id,
            branchId: branches[d.primary].id,
            dayOfWeek: day,
            startTime: "10:00",
            endTime: "18:00",
            slotMinutes: 30,
          }),
        );
      }
    }
  }
}

async function seedUsers(branches: Record<string, Branch>): Promise<void> {
  const repo = AppDataSource.getRepository(User);
  const wanted = [
    {
      email: env.TEST_EMAIL_DEV,
      name: "Harshit Raizada",
      role: UserRole.ADMIN,
      team: UserTeam.BOTH,
      branch: "GK",
    },
    {
      email: "kunal@stunningdentistry.in",
      name: "Kunal",
      role: UserRole.ADMIN,
      team: UserTeam.BOTH,
      branch: "GK",
    },
    {
      email: "ritiks@stunningdentistry.in",
      name: "Ritik S",
      role: UserRole.ADMIN,
      team: UserTeam.BOTH,
      branch: "NSP",
    },

    {
      email: "hod@stunningdentistry.in",
      name: "Head of Department",
      role: UserRole.HOD,
      team: UserTeam.BOTH,
      branch: "GK",
    },
    {
      email: "hod.domestic@stunningdentistry.in",
      name: "HOD — Domestic",
      role: UserRole.HOD,
      team: UserTeam.DOMESTIC,
      branch: "GK",
    },
    {
      email: "hod.intl@stunningdentistry.in",
      name: "HOD — International",
      role: UserRole.HOD,
      team: UserTeam.INTERNATIONAL,
      branch: "NSP",
    },

    {
      email: "crm.domestic@stunningdentistry.in",
      name: "Domestic CRM 1 (Online)",
      role: UserRole.CRM,
      team: UserTeam.DOMESTIC,
      branch: "GK",
      isCheckedIn: true,
    },
    {
      email: "crm.intl@stunningdentistry.in",
      name: "International CRM 1 (Online)",
      role: UserRole.CRM,
      team: UserTeam.INTERNATIONAL,
      branch: "NSP",
      isCheckedIn: true,
    },
    {
      email: "crm.domestic2@stunningdentistry.in",
      name: "Domestic CRM 2 (Online)",
      role: UserRole.CRM,
      team: UserTeam.DOMESTIC,
      branch: "GK",
      isCheckedIn: true,
    },
    {
      email: "crm.intl2@stunningdentistry.in",
      name: "International CRM 2 (Online)",
      role: UserRole.CRM,
      team: UserTeam.INTERNATIONAL,
      branch: "NSP",
      isCheckedIn: true,
    },
    {
      email: "crm.domestic3@stunningdentistry.in",
      name: "Domestic CRM 3 (Online)",
      role: UserRole.CRM,
      team: UserTeam.DOMESTIC,
      branch: "GK",
      isCheckedIn: true,
    },
    {
      email: "crm.intl3@stunningdentistry.in",
      name: "International CRM 3 (Online)",
      role: UserRole.CRM,
      team: UserTeam.INTERNATIONAL,
      branch: "NSP",
      isCheckedIn: true,
    },

    {
      email: "crm.domestic4@stunningdentistry.in",
      name: "Domestic CRM 4 (Offline)",
      role: UserRole.CRM,
      team: UserTeam.DOMESTIC,
      branch: "NSP",
      isCheckedIn: false,
    },
    {
      email: "crm.intl4@stunningdentistry.in",
      name: "International CRM 4 (Offline)",
      role: UserRole.CRM,
      team: UserTeam.INTERNATIONAL,
      branch: "GK",
      isCheckedIn: false,
    },
    {
      email: "crm.domestic5@stunningdentistry.in",
      name: "Domestic CRM 5 (Offline)",
      role: UserRole.CRM,
      team: UserTeam.DOMESTIC,
      branch: "GK",
      isCheckedIn: false,
    },
    {
      email: "crm.intl5@stunningdentistry.in",
      name: "International CRM 5 (Offline)",
      role: UserRole.CRM,
      team: UserTeam.INTERNATIONAL,
      branch: "NSP",
      isCheckedIn: false,
    },
    {
      email: "crm.domestic6@stunningdentistry.in",
      name: "Domestic CRM 6 (Offline)",
      role: UserRole.CRM,
      team: UserTeam.DOMESTIC,
      branch: "GK",
      isCheckedIn: false,
    },
    {
      email: "crm.intl6@stunningdentistry.in",
      name: "International CRM 6 (Offline)",
      role: UserRole.CRM,
      team: UserTeam.INTERNATIONAL,
      branch: "NSP",
      isCheckedIn: false,
    },
    {
      email: "crm.domestic7@stunningdentistry.in",
      name: "Domestic CRM 7 (Offline)",
      role: UserRole.CRM,
      team: UserTeam.DOMESTIC,
      branch: "NSP",
      isCheckedIn: false,
    },
    {
      email: "crm.intl7@stunningdentistry.in",
      name: "International CRM 7 (Offline)",
      role: UserRole.CRM,
      team: UserTeam.INTERNATIONAL,
      branch: "GK",
      isCheckedIn: false,
    },
    {
      email: "crm.domestic8@stunningdentistry.in",
      name: "Domestic CRM 8 (Offline)",
      role: UserRole.CRM,
      team: UserTeam.DOMESTIC,
      branch: "GK",
      isCheckedIn: false,
    },

    {
      email: "consultant.gk@stunningdentistry.in",
      name: "Consultant — GK",
      role: UserRole.CONSULTANT,
      team: UserTeam.BOTH,
      branch: "GK",
    },
    {
      email: "consultant.nsp@stunningdentistry.in",
      name: "Consultant — NSP",
      role: UserRole.CONSULTANT,
      team: UserTeam.BOTH,
      branch: "NSP",
    },

    {
      email: "qa.domestic@stunningdentistry.in",
      name: "QA — Domestic",
      role: UserRole.QA,
      team: UserTeam.DOMESTIC,
      branch: "GK",
    },
    {
      email: "qa.intl@stunningdentistry.in",
      name: "QA — International",
      role: UserRole.QA,
      team: UserTeam.INTERNATIONAL,
      branch: "NSP",
    },

    // ── System Bot Users ────────────────────────────────────────────────
    // These are not real people. They act as the 'actor' for automated
    // lead captures. They are never checked in and never receive leads.
    {
      email: "bot.webform@stunningdentistry.in",
      name: "Web Form Bot",
      role: UserRole.CRM,
      team: UserTeam.BOTH,
      branch: "GK",
    },
    {
      email: "bot.justdial@stunningdentistry.in",
      name: "JustDial Bot",
      role: UserRole.CRM,
      team: UserTeam.BOTH,
      branch: "GK",
    },
    {
      email: "bot.meta@stunningdentistry.in",
      name: "Meta Import Bot",
      role: UserRole.CRM,
      team: UserTeam.BOTH,
      branch: "GK",
    },
    {
      email: "bot.email@stunningdentistry.in",
      name: "Email Lead Bot",
      role: UserRole.CRM,
      team: UserTeam.BOTH,
      branch: "GK",
    },
  ];
  for (const u of wanted) {
    const existing = await repo.findOne({ where: { email: u.email } });
    const row = existing ?? repo.create({ email: u.email, isActive: true });
    row.name = u.name;
    row.role = u.role;
    row.team = u.team;
    row.branchId = branches[u.branch].id;
    if ("isCheckedIn" in u) {
      row.isCheckedIn = Boolean(u.isCheckedIn);
      if (row.isCheckedIn) {
        row.lastCheckedInAt = new Date();
      }
    }
    await repo.save(row);
  }
}

async function seedCursors(): Promise<void> {
  const repo = AppDataSource.getRepository(AssignmentCursor);
  for (const team of [UserTeam.DOMESTIC, UserTeam.INTERNATIONAL]) {
    if (!(await repo.findOne({ where: { team } }))) {
      await repo.save(repo.create({ team, lastAssignedUserId: null }));
    }
  }
}

interface LeadFixture {
  name: string;
  phone?: string;
  email?: string;
  channel: LeadChannel;
  stage: LeadStage;
  ownerEmail: string;
}

const LEAD_FIXTURES: LeadFixture[] = [
  {
    name: "Aarav Sharma",
    phone: "+919810012345",
    channel: LeadChannel.WEBSITE,
    stage: LeadStage.NEW_LEAD,
    ownerEmail: "crm.domestic@stunningdentistry.in",
  },
  {
    name: "Diya Patel",
    phone: "+919820012345",
    channel: LeadChannel.WHATSAPP,
    stage: LeadStage.NEW_LEAD,
    ownerEmail: "crm.domestic@stunningdentistry.in",
  },
  {
    name: "John Smith",
    phone: "+16502530000",
    channel: LeadChannel.FACEBOOK,
    stage: LeadStage.NEW_LEAD,
    ownerEmail: "crm.intl@stunningdentistry.in",
  },
  {
    name: "Maria Garcia",
    email: "maria@example.com",
    channel: LeadChannel.EMAIL,
    stage: LeadStage.INTERESTED,
    ownerEmail: "crm.intl@stunningdentistry.in",
  },
  {
    name: "Rohan Mehta",
    phone: "+919830012345",
    channel: LeadChannel.REFERRAL,
    stage: LeadStage.HOT_LEAD,
    ownerEmail: "crm.domestic2@stunningdentistry.in",
  },
];

async function seedLeads(): Promise<void> {
  const users = AppDataSource.getRepository(User);
  const leads = AppDataSource.getRepository(Lead);
  const now = new Date();

  for (const f of LEAD_FIXTURES) {
    const owner = await users.findOne({ where: { email: f.ownerEmail } });
    if (!owner) continue;

    const phone = f.phone ? normalizePhone(f.phone) : null;
    const email = f.email ? normalizeEmail(f.email) : null;
    const phoneHash = phone ? computeBlindIndex(phone.e164) : null;
    const emailHash = email ? computeBlindIndex(email) : null;

    const where = [
      ...(phoneHash ? [{ phoneHash }] : []),
      ...(emailHash ? [{ emailHash }] : []),
    ];
    if (where.length && (await leads.findOne({ where }))) continue;

    await leads.save(
      leads.create({
        name: f.name,
        phoneEnc: phone ? encryptPersonalData(phone.e164) : null,
        phoneHash,
        emailEnc: email ? encryptPersonalData(email) : null,
        emailHash,
        channel: f.channel,
        stage: f.stage,
        isInternational: phone ? phone.isInternational : Boolean(email),
        ownerUserId: owner.id,
        assignedAt: now,
        encKeyVersion: currentEncryptionKeyVersion,
        firstActivityAt: now,
        lastActivityAt: now,
        createdByUserId: owner.id,
        updatedByUserId: owner.id,
      }),
    );
  }
}

export async function seedReferenceData(): Promise<void> {
  const branches = await seedBranches();
  await seedDoctors(branches);
  await seedUsers(branches);
  await seedCursors();
}

export { seedLeads };

async function main(): Promise<void> {
  await AppDataSource.initialize();
  await seedReferenceData();
  await seedLeads();
  logger.info(
    "Seed complete: branches, doctors, staff roster, assignment cursors, sample leads",
  );
  await AppDataSource.destroy();
}

if (require.main === module) {
  main().catch((err) => {
    logger.error({ err }, "Seed failed");
    process.exit(1);
  });
}
