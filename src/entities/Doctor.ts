import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Branch } from "./Branch";
import { DoctorBranch } from "./DoctorBranch";
import { User } from "./User";

@Entity("doctors")
export class Doctor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "uuid", default: () => "gen_random_uuid()" })
  publicId: string;

  @Column({ type: "varchar", length: 160 })
  name: string;

  @Column({ type: "varchar", length: 160, nullable: true })
  specialty: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  email: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone: string | null;

  // If the doctor also logs into the CRM (e.g. a consultant user)
  @Column({ type: "int", nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "userId" })
  user: User | null;

  @Column({ type: "int", nullable: true })
  primaryBranchId: number | null;

  @ManyToOne(() => Branch, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "primaryBranchId" })
  primaryBranch: Branch | null;

  // All branches this doctor practises at (M2M via the doctor_branches junction)
  @OneToMany(() => DoctorBranch, (doctorBranch) => doctorBranch.doctor)
  doctorBranches: DoctorBranch[];

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
