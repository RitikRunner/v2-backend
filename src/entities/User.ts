import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Branch } from "./Branch";

export enum UserRole {
  ADMIN = "admin",
  HOD = "hod",
  CRM = "crm",
  CONSULTANT = "consultant",
  QA = "qa",
}

export enum UserTeam {
  DOMESTIC = "domestic",
  INTERNATIONAL = "international",
  BOTH = "both",
}

export enum UserPresence {
  AVAILABLE = "available",
  BUSY = "busy",
  ON_BREAK = "on_break",
  AWAY = "away",
  OFFLINE = "offline",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255 })
  email: string;

  @Column({
    type: "enum",
    enum: UserRole,
    enumName: "user_role",
    default: UserRole.CRM,
  })
  role: UserRole;

  @Column({ type: "varchar", length: 255, nullable: true })
  name: string | null;

  @Column({
    type: "enum",
    enum: UserTeam,
    enumName: "user_team",
    nullable: true,
  })
  team: UserTeam | null;

  @Column({ type: "int", nullable: true })
  branchId: number | null;

  @ManyToOne(() => Branch, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "branchId" })
  branch: Branch | null;

  @Column({
    type: "enum",
    enum: UserPresence,
    enumName: "user_presence",
    default: UserPresence.OFFLINE,
  })
  presenceStatus: UserPresence;

  @Column({ type: "boolean", default: false })
  isCheckedIn: boolean;

  @Column({ type: "timestamptz", nullable: true })
  lastSeenAt: Date | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  callingExtension: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  waPhoneNumberId: string | null;

  @Column({ type: "int", nullable: true })
  reportsToUserId: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "reportsToUserId" })
  reportsTo: User | null;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "timestamptz", nullable: true })
  lastCheckedInAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
