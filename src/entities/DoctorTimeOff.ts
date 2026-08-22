import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Branch } from "./Branch";
import { Doctor } from "./Doctor";

@Entity("doctor_time_off")
export class DoctorTimeOff {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int", nullable: true })
  doctorId: number | null;

  @ManyToOne(() => Doctor, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "doctorId" })
  doctor: Doctor | null;

  @Column({ type: "int", nullable: true })
  branchId: number | null;

  @ManyToOne(() => Branch, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "branchId" })
  branch: Branch | null;

  @Column({ type: "timestamptz" })
  startAt: Date;

  @Column({ type: "timestamptz" })
  endAt: Date;

  @Column({ type: "varchar", length: 160, nullable: true })
  reason: string | null;
}
