import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Branch } from "./Branch";

export enum SocialAccountPlatform {
  FACEBOOK = "facebook",
  INSTAGRAM = "instagram",
}

@Entity("social_accounts")
export class SocialAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: "enum",
    enum: SocialAccountPlatform,
    enumName: "social_account_platform",
  })
  platform: SocialAccountPlatform;

  @Column({ type: "varchar", length: 64 })
  accountId: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  accountName: string | null;

  @Column({ type: "bytea" })
  pageAccessTokenEnc: Buffer;

  @Column({ type: "timestamptz", nullable: true })
  tokenExpiresAt: Date | null;

  @Column({ type: "int", nullable: true })
  branchId: number | null;

  @ManyToOne(() => Branch, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "branchId" })
  branch: Branch | null;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "timestamptz", nullable: true })
  lastImportAt: Date | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  lastImportCursor: string | null;

  @Column({ type: "smallint", default: 1 })
  encKeyVersion: number;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
