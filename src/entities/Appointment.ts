import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Branch } from "./Branch";
import { Doctor } from "./Doctor";
import { Lead } from "./Lead";
import { Patient } from "./Patient";

export enum AppointmentFor {
  SELF = "self",
  FAMILY = "family",
}

export enum AppointmentType {
  CONSULTATION = "consultation",
  IN_CLINIC = "in_clinic",
  ONLINE = "online",
}

export enum AppointmentStatus {
  SCHEDULED = "scheduled",
  CONFIRMED = "confirmed",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  NO_SHOW = "no_show",
}

@Entity("appointments")
export class Appointment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "uuid", default: () => "gen_random_uuid()" })
  publicId: string;

  @Column({ type: "int", nullable: true })
  leadId: number | null;

  @ManyToOne(() => Lead, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "leadId" })
  lead: Lead | null;

  @Column({ type: "int", nullable: true })
  patientId: number | null;

  @ManyToOne(() => Patient, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "patientId" })
  patient: Patient | null;

  @Column({
    type: "enum",
    enum: AppointmentFor,
    enumName: "appointment_for",
    default: AppointmentFor.SELF,
  })
  forWhom: AppointmentFor;

  @Column({ type: "int", nullable: true })
  forPatientId: number | null;

  @ManyToOne(() => Patient, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "forPatientId" })
  forPatient: Patient | null;

  @Column({
    type: "enum",
    enum: AppointmentType,
    enumName: "appointment_type",
    default: AppointmentType.CONSULTATION,
  })
  type: AppointmentType;

  @Column({ type: "int", nullable: true })
  doctorId: number | null;

  @ManyToOne(() => Doctor, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "doctorId" })
  doctor: Doctor | null;

  @Column({ type: "int", nullable: true })
  branchId: number | null;

  @ManyToOne(() => Branch, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "branchId" })
  branch: Branch | null;

  @Column({ type: "bytea", nullable: true })
  chiefComplaintEnc: Buffer | null;

  @Column({ type: "bytea", nullable: true })
  lookingForEnc: Buffer | null;

  @Column({ type: "bytea", nullable: true })
  notesEnc: Buffer | null;

  @Column({ type: "text", array: true, nullable: true })
  tags: string[] | null;

  @Column({ type: "date" })
  scheduledDate: string;

  @Column({ type: "time", nullable: true })
  scheduledTime: string | null;

  @Column({ type: "int", default: 30 })
  durationMinutes: number;

  @Column({
    type: "enum",
    enum: AppointmentStatus,
    enumName: "appointment_status",
    default: AppointmentStatus.SCHEDULED,
  })
  status: AppointmentStatus;

  @Column({ type: "int", nullable: true })
  bookedByUserId: number | null;

  @Column({ type: "text", nullable: true })
  meetingLink: string | null;

  @Column({ type: "text", nullable: true })
  cancelledReason: string | null;

  @Column({ type: "timestamptz", nullable: true })
  cancelledAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  reminderSentAt: Date | null;

  @Column({ type: "smallint", default: 1 })
  encKeyVersion: number;

  @Column({ type: "int", nullable: true })
  createdByUserId: number | null;

  @Column({ type: "int", nullable: true })
  updatedByUserId: number | null;

  @DeleteDateColumn({ type: "timestamptz", nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
