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
import { SocialAccount } from "./SocialAccount";

export enum SocialConversationPlatform {
  FACEBOOK = "facebook",
  INSTAGRAM = "instagram",
}

@Entity("social_conversations")
export class SocialConversation {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

  @Column({ type: "int" })
  socialAccountId: number;

  @ManyToOne(() => SocialAccount, { onDelete: "CASCADE" })
  @JoinColumn({ name: "socialAccountId" })
  socialAccount: SocialAccount;

  @Column({
    type: "enum",
    enum: SocialConversationPlatform,
    enumName: "social_conversation_platform",
  })
  platform: SocialConversationPlatform;

  @Column({ type: "varchar", length: 128 })
  externalConversationId: string;

  @Column({ type: "int", nullable: true })
  leadId: number | null;

  @ManyToOne(() => Lead, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "leadId" })
  lead: Lead | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  participantExternalId: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  participantName: string | null;

  @Column({ type: "varchar", length: 160, nullable: true })
  participantUsername: string | null;

  @Column({ type: "timestamptz", nullable: true })
  lastMessageAt: Date | null;

  @Column({ type: "int", default: 0 })
  messageCount: number;

  @Column({ type: "timestamptz", nullable: true })
  importedAt: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
