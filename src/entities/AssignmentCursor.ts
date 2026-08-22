import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User";

@Entity("assignment_cursors")
export class AssignmentCursor {
  @PrimaryColumn({ type: "varchar", length: 32 })
  team: string;

  @Column({ type: "int", nullable: true })
  lastAssignedUserId: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "lastAssignedUserId" })
  lastAssignedUser: User | null;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
