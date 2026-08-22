import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Branch } from "./Branch";
import { Doctor } from "./Doctor";

@Entity("doctor_availability")
export class DoctorAvailability {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  doctorId: number;

  @ManyToOne(() => Doctor, { onDelete: "CASCADE" })
  @JoinColumn({ name: "doctorId" })
  doctor: Doctor;

  @Column({ type: "int", nullable: true })
  branchId: number | null;

  @ManyToOne(() => Branch, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "branchId" })
  branch: Branch | null;

  @Column({ type: "smallint" })
  dayOfWeek: number;

  @Column({ type: "time" })
  startTime: string;

  @Column({ type: "time" })
  endTime: string;

  @Column({ type: "int", default: 30 })
  slotMinutes: number;

  @Column({ type: "boolean", default: false })
  isClosed: boolean;

  @Column({ type: "date", nullable: true })
  effectiveFrom: string | null;

  @Column({ type: "date", nullable: true })
  effectiveTo: string | null;
}
