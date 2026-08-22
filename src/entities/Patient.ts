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
import { Lead } from "./Lead";

export enum PatientGender {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
  UNKNOWN = "unknown",
}

export enum PatientRelationship {
  SELF = "self",
  SPOUSE = "spouse",
  CHILD = "child",
  PARENT = "parent",
  SIBLING = "sibling",
  GUARDIAN = "guardian",
  OTHER = "other",
}

export enum PatientStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export enum PatientErasureStatus {
  ACTIVE = "active",
  ERASURE_REQUESTED = "erasure_requested",
  ANONYMIZED = "anonymized",
}

@Entity("patients")
export class Patient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "uuid", default: () => "gen_random_uuid()" })
  publicId: string;

  @Column({ type: "varchar", length: 32, nullable: true })
  patientCode: string | null;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "bytea", nullable: true })
  phoneEnc: Buffer | null;

  @Column({ type: "bytea", nullable: true })
  phoneHash: Buffer | null;

  @Column({ type: "bytea", nullable: true })
  emailEnc: Buffer | null;

  @Column({ type: "bytea", nullable: true })
  emailHash: Buffer | null;

  @Column({ type: "bytea", nullable: true })
  dateOfBirthEnc: Buffer | null;

  @Column({ type: "boolean", default: false })
  isMinor: boolean;

  @Column({
    type: "enum",
    enum: PatientGender,
    enumName: "patient_gender",
    nullable: true,
  })
  gender: PatientGender | null;

  @Column({ type: "bytea", nullable: true })
  addressEnc: Buffer | null;

  @Column({ type: "bytea", nullable: true })
  notesEnc: Buffer | null;

  @Column({ type: "int", nullable: true })
  branchId: number | null;

  @ManyToOne(() => Branch, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "branchId" })
  branch: Branch | null;

  @Column({ type: "int", nullable: true })
  convertedFromLeadId: number | null;

  @ManyToOne(() => Lead, { onDelete: "RESTRICT", nullable: true })
  @JoinColumn({ name: "convertedFromLeadId" })
  convertedFromLead: Lead | null;

  @Column({ type: "timestamptz", nullable: true })
  convertedAt: Date | null;

  @Column({ type: "int", nullable: true })
  relatedPatientId: number | null;

  @ManyToOne(() => Patient, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "relatedPatientId" })
  relatedPatient: Patient | null;

  @Column({
    type: "enum",
    enum: PatientRelationship,
    enumName: "patient_relationship",
    nullable: true,
  })
  relationship: PatientRelationship | null;

  @Column({ type: "boolean", default: false })
  isFamilyHead: boolean;

  @Column({
    type: "enum",
    enum: PatientStatus,
    enumName: "patient_status",
    default: PatientStatus.ACTIVE,
  })
  status: PatientStatus;

  @Column({
    type: "enum",
    enum: PatientErasureStatus,
    enumName: "patient_erasure_status",
    default: PatientErasureStatus.ACTIVE,
  })
  erasureStatus: PatientErasureStatus;

  @Column({ type: "timestamptz", nullable: true })
  retentionUntil: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  anonymizedAt: Date | null;

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
