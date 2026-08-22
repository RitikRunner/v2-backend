import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("inbound_events")
@Index("UQ_inbound_events_channel_externalId", ["channel", "externalEventId"], {
  unique: true,
})
export class InboundEvent {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

  @Column({ type: "varchar", length: 64 })
  channel: string;

  @Column({ type: "varchar", length: 512 })
  externalEventId: string;

  @CreateDateColumn({ type: "timestamptz" })
  processedAt: Date;
}
