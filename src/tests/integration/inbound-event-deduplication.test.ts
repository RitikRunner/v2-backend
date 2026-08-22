import { expect } from "chai";
import { AppDataSource } from "../../data-source";
import { InboundEvent } from "../../entities/InboundEvent";
import { isUniqueConstraintViolation } from "../../utils/typeorm-helpers";

describe("InboundEvent Relational Deduplication Engine", () => {
  const eventRepo = () => AppDataSource.getRepository(InboundEvent);

  beforeEach(async () => {
    await eventRepo()
      .createQueryBuilder()
      .delete()
      .where("externalEventId LIKE :prefix", { prefix: "test_evt_%" })
      .execute();
  });

  afterEach(async () => {
    await eventRepo()
      .createQueryBuilder()
      .delete()
      .where("externalEventId LIKE :prefix", { prefix: "test_evt_%" })
      .execute();
  });

  it("persists a valid external inbound event id with timestamp", async () => {
    const eventId = `test_evt_${Date.now()}`;
    const event = await eventRepo().save(
      eventRepo().create({
        channel: "email",
        externalEventId: eventId,
      }),
    );

    expect(event.id).to.not.be.undefined;
    expect(event.channel).to.equal("email");
    expect(event.externalEventId).to.equal(eventId);
    expect(event.processedAt).to.be.a("Date");
  });

  it("enforces database unique constraints against duplicated events in the same channel", async () => {
    const eventId = `test_evt_duplicate_${Date.now()}`;

    await eventRepo().save(
      eventRepo().create({
        channel: "email",
        externalEventId: eventId,
      }),
    );

    let duplicateError: any = null;
    try {
      await eventRepo().save(
        eventRepo().create({
          channel: "email",
          externalEventId: eventId,
        }),
      );
    } catch (err) {
      duplicateError = err;
    }

    expect(duplicateError).to.not.be.null;
    expect(isUniqueConstraintViolation(duplicateError)).to.be.true;
  });

  it("allows identical external event IDs if they arrive across independent channels", async () => {
    const eventId = `test_evt_cross_channel_${Date.now()}`;

    await eventRepo().save(
      eventRepo().create({
        channel: "email",
        externalEventId: eventId,
      }),
    );

    const metaEvent = await eventRepo().save(
      eventRepo().create({
        channel: "meta_webhook",
        externalEventId: eventId,
      }),
    );

    expect(metaEvent.id).to.not.be.undefined;
    expect(metaEvent.channel).to.equal("meta_webhook");
  });
});
