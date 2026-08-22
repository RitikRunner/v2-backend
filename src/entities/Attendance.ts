import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User";

@Entity("attendances")
export class Attendance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  userId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "date" })
  date: string;

  @Column({ type: "timestamptz" })
  checkInTime: Date;

  @Column({ type: "timestamptz", nullable: true })
  checkOutTime: Date | null;

  @Column({ type: "int", nullable: true })
  durationSeconds: number | null;

  @Column({ type: "varchar", length: 45, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
