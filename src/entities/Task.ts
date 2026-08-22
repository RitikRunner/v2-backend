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

export enum TaskType {
  FOLLOW_UP = "follow_up",
  CALLBACK = "callback",
  WHATSAPP = "whatsapp",
  EMAIL = "email",
  VISIT = "visit",
  DOCUMENT = "document",
  OTHER = "other",
}

export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

@Entity("tasks")
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  leadId: number;

  @ManyToOne(() => Lead, { onDelete: "CASCADE" })
  @JoinColumn({ name: "leadId" })
  lead: Lead;

  @Column({ type: "varchar", length: 255 })
  subject: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({
    type: "enum",
    enum: TaskType,
    enumName: "task_type",
    default: TaskType.FOLLOW_UP,
  })
  type: TaskType;

  @Column({
    type: "enum",
    enum: TaskPriority,
    enumName: "task_priority",
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Column({ type: "date", nullable: true })
  dueDate: string | null;

  @Column({ type: "time", nullable: true })
  dueTime: string | null;

  @Column({ type: "timestamptz", nullable: true })
  reminderAt: Date | null;

  @Column({ type: "int", nullable: true })
  ownerUserId: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "ownerUserId" })
  owner: User | null;

  @Column({ type: "int", nullable: true })
  createdByUserId: number | null;

  @Column({ type: "boolean", default: false })
  isDone: boolean;

  @Column({ type: "timestamptz", nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
