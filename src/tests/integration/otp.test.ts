import { expect } from "chai";
import { api, API } from "../support/app";
import { redis } from "../../config/redis";
import { getSessionRepository } from "../../repositories/session-repository";
import { SEEDED, getUser, seedOtp } from "../support/fixtures";

describe("POST /otp/create", () => {
  it("issues an OTP for a registered active user", async () => {
    const res = await api()
      .post(`${API}/otp/create`)
      .send({ email: SEEDED.admin });
    expect(res.status).to.equal(200);
    expect(res.body.message).to.be.a("string");
    expect(await redis.get(`otp:${SEEDED.admin}`)).to.be.a("string");
    expect(await redis.get(`otp:cooldown:${SEEDED.admin}`)).to.equal("1");
  });

  it("returns 404 for an unregistered email (staff-only login by design)", async () => {
    const res = await api()
      .post(`${API}/otp/create`)
      .send({ email: "nobody@stunningdentistry.in" });
    expect(res.status).to.equal(404);
    expect(res.body.message).to.contain("No account is registered");
  });

  it("returns 429 when requested again within the cooldown", async () => {
    await api()
      .post(`${API}/otp/create`)
      .send({ email: SEEDED.admin })
      .expect(200);
    const res = await api()
      .post(`${API}/otp/create`)
      .send({ email: SEEDED.admin });
    expect(res.status).to.equal(429);
  });

  it("returns 400 for an invalid email", async () => {
    const res = await api()
      .post(`${API}/otp/create`)
      .send({ email: "not-an-email" });
    expect(res.status).to.equal(400);
  });
});

describe("POST /otp/verify", () => {
  it("issues tokens and a session for a valid OTP", async () => {
    await seedOtp(SEEDED.admin, "123456");
    const res = await api()
      .post(`${API}/otp/verify`)
      .send({ email: SEEDED.admin, otp: "123456" });
    expect(res.status).to.equal(200);
    expect(res.body.accessToken).to.be.a("string");
    expect(res.body.refreshToken).to.be.a("string");
    expect(res.body.user.email).to.equal(SEEDED.admin);
    expect(await redis.get(`otp:${SEEDED.admin}`)).to.equal(null);

    const user = await getUser(SEEDED.admin);
    const sessions = await getSessionRepository().find({
      where: { userId: user.id },
    });
    expect(sessions).to.have.length(1);
  });

  it("returns 401 for a wrong OTP", async () => {
    await seedOtp(SEEDED.admin, "123456");
    const res = await api()
      .post(`${API}/otp/verify`)
      .send({ email: SEEDED.admin, otp: "000000" });
    expect(res.status).to.equal(401);
  });

  it("returns 401 when no OTP was requested", async () => {
    const res = await api()
      .post(`${API}/otp/verify`)
      .send({ email: SEEDED.admin, otp: "123456" });
    expect(res.status).to.equal(401);
  });

  it("returns 429 after exceeding the max attempts", async () => {
    await seedOtp(SEEDED.admin, "123456");
    for (let i = 0; i < 3; i++) {
      await api()
        .post(`${API}/otp/verify`)
        .send({ email: SEEDED.admin, otp: "000000" })
        .expect(401);
    }
    const res = await api()
      .post(`${API}/otp/verify`)
      .send({ email: SEEDED.admin, otp: "000000" });
    expect(res.status).to.equal(429);
  });

  it("returns 400 for a non-numeric OTP", async () => {
    const res = await api()
      .post(`${API}/otp/verify`)
      .send({ email: SEEDED.admin, otp: "abcdef" });
    expect(res.status).to.equal(400);
  });
});
