import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { DoctorBranch } from "./DoctorBranch";

@Entity("branches")
export class Branch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 160 })
  name: string;

  @Column({ type: "varchar", length: 32 })
  code: string;

  @Column({ type: "text", nullable: true })
  address: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  city: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  state: string | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  pincode: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone: string | null;

  @Column({ type: "varchar", length: 64, default: "Asia/Kolkata" })
  timezone: string;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  // Doctors practising at this branch (M2M via the doctor_branches junction)
  @OneToMany(() => DoctorBranch, (doctorBranch) => doctorBranch.branch)
  doctorBranches: DoctorBranch[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
