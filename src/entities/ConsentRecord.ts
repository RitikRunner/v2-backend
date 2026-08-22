import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Lead } from "./Lead";
import { Patient } from "./Patient";
import { User } from "./User";

export enum ConsentPurpose {
  SERVICE_DELIVERY = "service_delivery",
  APPOINTMENT_REMINDERS = "appointment_reminders",
  MARKETING_WHATSAPP = "marketing_whatsapp",
  MARKETING_EMAIL = "marketing_email",
  MARKETING_CALLS = "marketing_calls",
  CALL_RECORDING = "call_recording",
  THIRD_PARTY_SHARE = "third_party_share",
}

export enum ConsentStatus {
  GRANTED = "granted",
  WITHDRAWN = "withdrawn",
  EXPIRED = "expired",
}

export enum ConsentMethod {
  WEB_FORM = "web_form",
  WHATSAPP = "whatsapp",
  VERBAL_CALL = "verbal_call",
  PAPER = "paper",
  IMPORT = "import",
}

@Entity("consent_records")
export class ConsentRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  leadId: number;

  @ManyToOne(() => Lead, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "leadId" })
  lead: Lead;

  @Column({ type: "int", nullable: true })
  patientId: number | null;

  @ManyToOne(() => Patient, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "patientId" })
  patient: Patient | null;

  @Column({ type: "enum", enum: ConsentPurpose, enumName: "consent_purpose" })
  purpose: ConsentPurpose;

  @Column({ type: "enum", enum: ConsentStatus, enumName: "consent_status" })
  status: ConsentStatus;

  @Column({ type: "enum", enum: ConsentMethod, enumName: "consent_method" })
  method: ConsentMethod;

  @Column({ type: "varchar", length: 64, nullable: true })
  channel: string | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  noticeVersion: string | null;

  @Column({ type: "timestamptz", nullable: true })
  grantedAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  withdrawnAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  expiresAt: Date | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  sourceIp: string | null;

  @Column({ type: "boolean", default: false })
  isGuardianConsent: boolean;

  @Column({ type: "int", nullable: true })
  capturedByUserId: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "capturedByUserId" })
  capturedBy: User | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
