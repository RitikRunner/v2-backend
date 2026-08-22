import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Branch } from "./Branch";
import { Patient } from "./Patient";
import { User } from "./User";

export enum LeadChannel {
  WHATSAPP = "whatsapp",
  INSTAGRAM = "instagram",
  FACEBOOK = "facebook",
  GOOGLE_ADS = "google_ads",
  WEBSITE = "website",
  PHONE_CALL = "phone_call",
  JUSTDIAL = "justdial",
  REFERRAL = "referral",
  WALK_IN = "walk_in",
  EMAIL = "email",
  MANUAL = "manual",
  OTHER = "other",
}

export enum SocialPlatform {
  FACEBOOK = "facebook",
  INSTAGRAM = "instagram",
}

export enum LeadStage {
  NEW_LEAD = "new_lead",
  HOT_LEAD = "hot_lead",
  INTERESTED = "interested",
  NEUTRAL = "neutral",
  NOT_INTERESTED = "not_interested",
  MARKETING = "marketing",
  JUNK = "junk",
  NO_RESPONSE = "no_response",
  CONSULTATION_BOOKED = "consultation_booked",
  EXISTING_CLIENT = "existing_client",
  FOLLOW_UP_FOR_CONSULTATION = "follow_up_for_consultation",
  DUPLICATE = "duplicate",
  JOB_ENQUIRY = "job_enquiry",
  ENQUIRED_BY_MISTAKE = "enquired_by_mistake",
  E_CONSULT_BY_HEAD = "e_consult_by_head",
  BUDGET_ISSUE = "budget_issue",
  FOLLOW_UP_FOR_TREATMENT = "follow_up_for_treatment",
  FOLLOW_UP_FOR_DISCUSSION = "follow_up_for_discussion",
  FIGURING_OUT = "figuring_out",
  TREATMENT_STARTED = "treatment_started",
  TREATMENT_ON_GOING = "treatment_on_going",
  TREATMENT_COMPLETED = "treatment_completed",
  REQUESTING_REFUND = "requesting_refund",
  TREATMENT_ABORTED = "treatment_aborted",
  CONSULTATION_DONE = "consultation_done",
  DISCUSSION_DONE = "discussion_done",
  DISCUSSION_PENDING = "discussion_pending",
  DROPPED_CONSULT = "dropped_consult",
  DROPPED_DISCUSS = "dropped_discuss",
  BOUNCED_COMPETITOR = "bounced_competitor",
}

export enum LeadTreatment {
  GENERAL = "general",
  IMPLANTS = "implants",
  ORTHODONTICS = "orthodontics",
  ALIGNERS = "aligners",
  ROOT_CANAL = "root_canal",
  CROWNS_BRIDGES = "crowns_bridges",
  WHITENING = "whitening",
  VENEERS = "veneers",
  DENTURES = "dentures",
  EXTRACTION = "extraction",
  GUM_TREATMENT = "gum_treatment",
  PEDIATRIC = "pediatric",
  COSMETIC = "cosmetic",
  FULL_MOUTH = "full_mouth",
  OTHER = "other",
}

export enum LeadReEnquiryStatus {
  NONE = "none",
  RE_ENQUIRED = "re_enquired",
  REACTIVATED = "reactivated",
}

export enum LeadErasureStatus {
  ACTIVE = "active",
  ERASURE_REQUESTED = "erasure_requested",
  ANONYMIZED = "anonymized",
}

@Entity("leads")
export class Lead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "uuid", default: () => "gen_random_uuid()" })
  publicId: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  name: string | null;

  @Column({ type: "bytea", nullable: true })
  phoneEnc: Buffer | null;

  @Column({ type: "bytea", nullable: true })
  phoneHash: Buffer | null;

  @Column({ type: "bytea", nullable: true })
  altPhoneEnc: Buffer | null;

  @Column({ type: "bytea", nullable: true })
  altPhoneHash: Buffer | null;

  @Column({ type: "bytea", nullable: true })
  whatsappNumberEnc: Buffer | null;

  @Column({ type: "bytea", nullable: true })
  whatsappHash: Buffer | null;

  @Column({ type: "bytea", nullable: true })
  emailEnc: Buffer | null;

  @Column({ type: "bytea", nullable: true })
  emailHash: Buffer | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  city: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  state: string | null;

  @Column({ type: "varchar", length: 120, default: "India" })
  country: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  area: string | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  pincode: string | null;

  @Column({ type: "bytea", nullable: true })
  addressEnc: Buffer | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  timezone: string | null;

  @Column({
    type: "enum",
    enum: LeadTreatment,
    enumName: "lead_treatment",
    nullable: true,
  })
  treatment: LeadTreatment | null;

  @Column({ type: "bytea", nullable: true })
  dentalProblemEnc: Buffer | null;

  @Column({ type: "bytea", nullable: true })
  messageEnc: Buffer | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  budget: string | null;

  @Column({ type: "date", nullable: true })
  preferredDate: string | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  preferredTime: string | null;

  @Column({
    type: "enum",
    enum: LeadChannel,
    enumName: "lead_channel",
    default: LeadChannel.OTHER,
  })
  channel: LeadChannel;

  @Column({ type: "varchar", length: 120, nullable: true })
  source: string | null;

  @Column({ type: "varchar", length: 160, nullable: true })
  socialHandle: string | null;

  @Column({
    type: "enum",
    enum: SocialPlatform,
    enumName: "social_platform",
    nullable: true,
  })
  socialPlatform: SocialPlatform | null;

  @Column({ type: "varchar", length: 160, nullable: true })
  campaign: string | null;

  @Column({ type: "varchar", length: 512, nullable: true })
  adId: string | null;

  @Column({ type: "varchar", length: 512, nullable: true })
  adSetId: string | null;

  @Column({ type: "varchar", length: 160, nullable: true })
  adName: string | null;

  @Column({ type: "text", nullable: true })
  landingPage: string | null;

  @Column({ type: "varchar", length: 160, nullable: true })
  formName: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  utmMedium: string | null;

  @Column({ type: "int", nullable: true })
  ownerUserId: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "ownerUserId" })
  owner: User | null;

  @Column({ type: "timestamptz", nullable: true })
  assignedAt: Date | null;

  @Column({
    type: "enum",
    enum: LeadStage,
    enumName: "lead_stage",
    default: LeadStage.NEW_LEAD,
  })
  stage: LeadStage;

  @Column({ type: "boolean", default: false })
  isCalled: boolean;

  @Column({ type: "boolean", default: false })
  isWhatsappCalled: boolean;

  @Column({ type: "boolean", default: false })
  isWhatsappMessaged: boolean;

  @Column({ type: "boolean", default: false })
  isEmailed: boolean;

  @Column({ type: "boolean", default: false })
  contactMade: boolean;

  @Column({ type: "boolean", default: false })
  doNotCall: boolean;

  @Column({ type: "boolean", default: false })
  doNotSms: boolean;

  @Column({ type: "boolean", default: false })
  doNotEmail: boolean;

  @Column({ type: "boolean", default: false })
  doNotWhatsapp: boolean;

  @Column({ type: "boolean", default: false })
  isInternational: boolean;

  @Column({ type: "int", default: 0 })
  leadScore: number;

  @Column({ type: "int", default: 0 })
  contactCount: number;

  @Column({ type: "int", default: 0 })
  reEnquiryCount: number;

  @Column({ type: "int", default: 0 })
  missedCallCount: number;

  @Column({ type: "timestamptz", nullable: true })
  consultationDate: Date | null;

  @Column({ type: "int", nullable: true })
  consultationBranchId: number | null;

  @ManyToOne(() => Branch, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "consultationBranchId" })
  consultationBranch: Branch | null;

  @Column({ type: "timestamptz", nullable: true })
  followUpDate: Date | null;

  @Column({ type: "boolean", default: false })
  isTreatmentBooked: boolean;

  @Column({ type: "timestamptz", nullable: true })
  firstActivityAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  lastActivityAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  lastContactedAt: Date | null;

  @Column({ type: "bytea", nullable: true })
  lastCallRemarkEnc: Buffer | null;

  @Column({ type: "timestamptz", nullable: true })
  lastVisitAt: Date | null;

  @Column({ type: "boolean", default: false })
  isPatient: boolean;

  @Column({ type: "int", nullable: true })
  patientId: number | null;

  @ManyToOne(() => Patient, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "patientId" })
  patient: Patient | null;

  @Column({ type: "boolean", default: false })
  isDuplicate: boolean;

  @Column({ type: "int", nullable: true })
  duplicateOfLeadId: number | null;

  @ManyToOne(() => Lead, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "duplicateOfLeadId" })
  duplicateOf: Lead | null;

  @Column({ type: "int", nullable: true })
  qualityScore: number | null;

  @Column({ type: "text", array: true, nullable: true })
  tags: string[] | null;

  @Column({
    type: "enum",
    enum: LeadReEnquiryStatus,
    enumName: "lead_reenquiry_status",
    default: LeadReEnquiryStatus.NONE,
  })
  reEnquiryStatus: LeadReEnquiryStatus;

  @Column({
    type: "enum",
    enum: LeadErasureStatus,
    enumName: "lead_erasure_status",
    default: LeadErasureStatus.ACTIVE,
  })
  erasureStatus: LeadErasureStatus;

  @Column({ type: "timestamptz", nullable: true })
  retentionUntil: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  anonymizedAt: Date | null;

  @Column({ type: "smallint", default: 1 })
  encKeyVersion: number;

  @Column({ type: "int", nullable: true })
  createdByUserId: number | null;

  @Column({ type: "int", nullable: true })
  updatedByUserId: number | null;

  @DeleteDateColumn({ type: "timestamptz", nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
