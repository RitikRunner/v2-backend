import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Appointment } from "./Appointment";
import { Lead } from "./Lead";
import { Message } from "./Message";
import { User } from "./User";

export enum ActivityType {
  INCOMING_CALL = "incoming_call",
  OUTGOING_CALL = "outgoing_call",
  WHATSAPP_MESSAGE = "whatsapp_message",
  WHATSAPP_CALL = "whatsapp_call",
  EMAIL = "email",
  NOTE = "note",
  STATUS_CHANGE = "status_change",
  APPOINTMENT = "appointment",
  FOLLOW_UP = "follow_up",
  ASSIGNMENT = "assignment",
  LEAD_CREATED = "lead_created",
  RE_ENQUIRY = "re_enquiry",
}

export enum ActivityDirection {
  INBOUND = "inbound",
  OUTBOUND = "outbound",
}

export enum ActivityCallOutcome {
  ANSWERED = "answered",
  MISSED = "missed",
  BUSY = "busy",
  NO_ANSWER = "no_answer",
  FAILED = "failed",
  VOICEMAIL = "voicemail",
}

// The CRM/funnel timeline. Chat bodies live in `messages`; this table is not a
// mirror of chat — it records calls, notes, status changes, assignments, etc.
@Entity("activities")
export class Activity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

  @Column({ type: "int" })
  leadId: number;

  @ManyToOne(() => Lead, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "leadId" })
  lead: Lead;

  @Column({ type: "int", nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "userId" })
  user: User | null;

  @Column({ type: "int", nullable: true })
  previousOwnerId: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "previousOwnerId" })
  previousOwner: User | null;

  @Column({ type: "int", nullable: true })
  newOwnerId: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "newOwnerId" })
  newOwner: User | null;

  @Column({ type: "enum", enum: ActivityType, enumName: "activity_type" })
  type: ActivityType;

  @Column({
    type: "enum",
    enum: ActivityDirection,
    enumName: "activity_direction",
    nullable: true,
  })
  direction: ActivityDirection | null;

  @Column({ type: "int", nullable: true })
  durationSeconds: number | null;

  @Column({ type: "bytea", nullable: true })
  recordingUrlEnc: Buffer | null;

  @Column({
    type: "enum",
    enum: ActivityCallOutcome,
    enumName: "activity_call_outcome",
    nullable: true,
  })
  outcome: ActivityCallOutcome | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  subject: string | null;

  @Column({ type: "bytea", nullable: true })
  contentEnc: Buffer | null;

  @Column({ type: "varchar", length: 30, nullable: true })
  statusFrom: string | null;

  @Column({ type: "varchar", length: 30, nullable: true })
  statusTo: string | null;

  @Column({ type: "int", nullable: true })
  relatedAppointmentId: number | null;

  @ManyToOne(() => Appointment, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "relatedAppointmentId" })
  relatedAppointment: Appointment | null;

  @Column({ type: "bigint", nullable: true })
  relatedMessageId: string | null;

  @ManyToOne(() => Message, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "relatedMessageId" })
  relatedMessage: Message | null;

  @Column({ type: "smallint", default: 1 })
  encKeyVersion: number;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
