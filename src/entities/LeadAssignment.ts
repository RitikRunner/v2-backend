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
import { User } from "./User";

export enum AssignmentStatus {
  PENDING = "pending",
  RESPONDED = "responded",
  MISSED = "missed",
  TRANSFERRED = "transferred",
  ESCALATED = "escalated",
  CLOSED = "closed",
}

@Entity("lead_assignments")
export class LeadAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  leadId: number;

  @ManyToOne(() => Lead, { onDelete: "CASCADE" })
  @JoinColumn({ name: "leadId" })
  lead: Lead;

  @Column({ type: "int", nullable: true })
  assignedToUserId: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "assignedToUserId" })
  assignedTo: User | null;

  @Column({ type: "int", nullable: true })
  assignedByUserId: number | null;

  @Column({ type: "int", nullable: true })
  escalatedToUserId: number | null;

  @Column({ type: "timestamptz", default: () => "now()" })
  assignedAt: Date;

  @Column({ type: "timestamptz" })
  deadlineAt: Date;

  @Column({ type: "timestamptz", nullable: true })
  respondedAt: Date | null;

  @Column({ type: "boolean", nullable: true })
  respondedInTime: boolean | null;

  @Column({ type: "int", nullable: true })
  firstResponseSeconds: number | null;

  @Column({ type: "int", default: 0 })
  transferCount: number;

  @Column({ type: "boolean", default: false })
  escalatedToHod: boolean;

  @Column({ type: "timestamptz", nullable: true })
  escalatedAt: Date | null;

  @Column({
    type: "enum",
    enum: AssignmentStatus,
    enumName: "assignment_status",
    default: AssignmentStatus.PENDING,
  })
  status: AssignmentStatus;

  @Column({ type: "varchar", length: 160, nullable: true })
  reason: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
