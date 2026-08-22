import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Branch } from "./Branch";
import { Doctor } from "./Doctor";

// Explicit junction: a doctor can practise at multiple branches (GK & NSP),
// and a branch has many doctors. Kept as a first-class entity so the table is
// declared here and can carry its own columns later (e.g. isPrimaryAtBranch).
// Uniqueness of (doctorId, branchId) is enforced by a migration index.
@Entity("doctor_branches")
export class DoctorBranch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  doctorId: number;

  @ManyToOne(() => Doctor, (doctor) => doctor.doctorBranches, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "doctorId" })
  doctor: Doctor;

  @Column({ type: "int" })
  branchId: number;

  @ManyToOne(() => Branch, (branch) => branch.doctorBranches, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "branchId" })
  branch: Branch;
}
