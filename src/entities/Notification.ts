import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Lead } from "./Lead";
import { User } from "./User";

export enum NotificationType {
  ASSIGNMENT = "assignment",
  RESPONSE_DUE = "response_due",
  ESCALATION = "escalation",
  FOLLOW_UP_DUE = "follow_up_due",
  APPOINTMENT = "appointment",
  NEW_MESSAGE = "new_message",
  MISSED_CALL = "missed_call",
  SYSTEM = "system",
}

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

  @Column({ type: "int" })
  userId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", length: 160 })
  title: string;

  @Column({ type: "text", nullable: true })
  message: string | null;

  @Column({
    type: "enum",
    enum: NotificationType,
    enumName: "notification_type",
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  @Column({ type: "int", nullable: true })
  linkedLeadId: number | null;

  @ManyToOne(() => Lead, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "linkedLeadId" })
  linkedLead: Lead | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  linkedEntityType: string | null;

  @Column({ type: "int", nullable: true })
  linkedEntityId: number | null;

  @Column({ type: "boolean", default: false })
  isRead: boolean;

  @Column({ type: "timestamptz", nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
