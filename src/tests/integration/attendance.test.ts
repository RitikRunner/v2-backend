import { expect } from "chai";
import { api, API } from "../support/app";
import { AppDataSource } from "../../data-source";
import { User, UserRole } from "../../entities/User";
import { Attendance } from "../../entities/Attendance";
import * as tokenService from "../../services/token-service";

describe("Attendance Integration Tests", () => {
  let user: User;
  let token: string;

  before(async () => {
    // Create a test user
    const userRepo = AppDataSource.getRepository(User);
    user = userRepo.create({
      name: "Test CRM",
      email: "test.crm@stunning.local",
      role: UserRole.CRM,
      isActive: true,
      isCheckedIn: false,
    });
    user = await userRepo.save(user);

    // Generate token
    const tokens = await tokenService.issueTokensForUser(user);
    token = tokens.accessToken;
  });

  afterEach(async () => {
    // Clear out attendance after each test to keep things isolated
    await AppDataSource.getRepository(Attendance).clear();

    // Reset user state
    const userRepo = AppDataSource.getRepository(User);
    user.isCheckedIn = false;
    user.lastCheckedInAt = null;
    await userRepo.save(user);
  });

  after(async () => {
    // Clean up
    await AppDataSource.getRepository(User).delete(user.id);
  });

  it("should check in successfully and create an attendance record", async () => {
    const res = await api()
      .post(`${API}/users/check-in`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.isCheckedIn).to.be.true;
    expect(res.body.activeSessionStart).to.not.be.null;
    expect(res.body.todayTotalDurationSeconds).to.equal(0); // Brand new day

    // Verify in DB
    const attendanceRepo = AppDataSource.getRepository(Attendance);
    const records = await attendanceRepo.find({ where: { userId: user.id } });
    expect(records).to.have.lengthOf(1);
    expect(records[0].checkOutTime).to.be.null;

    // User should be updated
    const updatedUser = await AppDataSource.getRepository(User).findOneBy({
      id: user.id,
    });
    expect(updatedUser?.isCheckedIn).to.be.true;
  });

  it("should fail to check in if already checked in", async () => {
    // First check-in
    await api()
      .post(`${API}/users/check-in`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    // Second check-in should fail
    const res = await api()
      .post(`${API}/users/check-in`)
      .set("Authorization", `Bearer ${token}`)
      .expect(400);

    expect(res.body.message).to.equal("User is already checked in");
  });

  it("should check out successfully, accumulate duration across multiple sessions, and allow re-check-in", async () => {
    // 1. First Check-in
    await api()
      .post(`${API}/users/check-in`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    // Sleep to simulate session duration
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // 2. First Check-out
    const outRes1 = await api()
      .post(`${API}/users/check-out`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const firstSessionDuration = outRes1.body.todayTotalDurationSeconds;
    expect(firstSessionDuration).to.be.greaterThan(0);

    // 3. Second Check-in (Re-check-in)
    const reInRes = await api()
      .post(`${API}/users/check-in`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(reInRes.body.isCheckedIn).to.be.true;
    // previous duration is preserved while actively checked in!
    expect(reInRes.body.todayTotalDurationSeconds).to.equal(
      firstSessionDuration,
    );

    // Sleep again to simulate the second session
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // 4. Second Check-out
    const outRes2 = await api()
      .post(`${API}/users/check-out`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const totalAccumulatedDuration = outRes2.body.todayTotalDurationSeconds;

    // Total duration should now be greater than the first session's duration
    expect(totalAccumulatedDuration).to.be.greaterThan(firstSessionDuration);

    // Verify in DB that we have 2 complete records
    const attendanceRepo = AppDataSource.getRepository(Attendance);
    const records = await attendanceRepo.find({ where: { userId: user.id } });
    expect(records).to.have.lengthOf(2);
    expect(records[0].checkOutTime).to.not.be.null;
    expect(records[1].checkOutTime).to.not.be.null;
    expect(records[0].durationSeconds! + records[1].durationSeconds!).to.equal(
      totalAccumulatedDuration,
    );
  });

  it("should fail to check out if not checked in", async () => {
    const res = await api()
      .post(`${API}/users/check-out`)
      .set("Authorization", `Bearer ${token}`)
      .expect(400);

    expect(res.body.message).to.equal("User is not checked in");
  });
});
