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
import { User } from "./User";

export enum MessageProvider {
  CLOUD_API = "cloud_api",
  META_GRAPH = "meta_graph",
}

export enum MessageChannel {
  WHATSAPP = "whatsapp",
  INSTAGRAM = "instagram",
  FACEBOOK = "facebook",
}

export enum MessageDirection {
  INBOUND = "inbound",
  OUTBOUND = "outbound",
}

export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
  DOCUMENT = "document",
  AUDIO = "audio",
  VIDEO = "video",
  STICKER = "sticker",
  LOCATION = "location",
  CONTACT = "contact",
  TEMPLATE = "template",
  INTERACTIVE = "interactive",
}

export enum MessageDeliveryStatus {
  QUEUED = "queued",
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
  FAILED = "failed",
}

@Entity("messages")
export class Message {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

  @Column({ type: "int" })
  leadId: number;

  @ManyToOne(() => Lead, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "leadId" })
  lead: Lead;

  @Column({ type: "int", nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "userId" })
  user: User | null;

  @Column({
    type: "enum",
    enum: MessageProvider,
    enumName: "message_provider",
    default: MessageProvider.CLOUD_API,
  })
  provider: MessageProvider;

  @Column({
    type: "enum",
    enum: MessageChannel,
    enumName: "message_channel",
    default: MessageChannel.WHATSAPP,
  })
  channel: MessageChannel;

  @Column({
    type: "enum",
    enum: MessageDirection,
    enumName: "message_direction",
  })
  direction: MessageDirection;

  @Column({
    type: "enum",
    enum: MessageType,
    enumName: "message_type",
    default: MessageType.TEXT,
  })
  messageType: MessageType;

  @Column({ type: "bytea", nullable: true })
  contentEnc: Buffer | null;

  @Column({ type: "bytea", nullable: true })
  captionEnc: Buffer | null;

  @Column({ type: "bytea", nullable: true })
  mediaUrlEnc: Buffer | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  mediaMimeType: string | null;

  @Column({
    type: "enum",
    enum: MessageDeliveryStatus,
    enumName: "message_delivery_status",
    nullable: true,
  })
  deliveryStatus: MessageDeliveryStatus | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  waPhoneNumberId: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  providerMessageId: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  conversationId: string | null;

  @Column({ type: "boolean", default: false })
  isTemplate: boolean;

  @Column({ type: "varchar", length: 160, nullable: true })
  templateName: string | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  errorCode: string | null;

  @Column({ type: "text", nullable: true })
  errorMessage: string | null;

  @Column({ type: "timestamptz", nullable: true })
  sentAt: Date | null;

  @Column({ type: "smallint", default: 1 })
  encKeyVersion: number;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
