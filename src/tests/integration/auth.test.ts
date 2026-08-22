import { expect } from "chai";
import { IsNull } from "typeorm";
import { api, API } from "../support/app";
import * as tokenService from "../../services/token-service";
import { getSessionRepository } from "../../repositories/session-repository";
import { sha256 } from "../../utils/crypto";
import { SEEDED, bearer, getUser } from "../support/fixtures";

describe("POST /auth/logout", () => {
  it("returns 401 without a bearer token", async () => {
    const res = await api().post(`${API}/auth/logout`).send({});
    expect(res.status).to.equal(401);
  });

  it("revokes a single session by refresh token", async () => {
    const user = await getUser(SEEDED.admin);
    const { accessToken, refreshToken } =
      await tokenService.issueTokensForUser(user);

    const res = await api()
      .post(`${API}/auth/logout`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ refreshToken });
    expect(res.status).to.equal(200);

    const session = await getSessionRepository().findOne({
      where: { refreshTokenHash: sha256(refreshToken) },
    });
    expect(session?.revokedAt).to.not.equal(null);
  });

  it("revokes every active session when no refresh token is given", async () => {
    const user = await getUser(SEEDED.admin);
    await tokenService.issueTokensForUser(user);
    await tokenService.issueTokensForUser(user);

    const res = await api()
      .post(`${API}/auth/logout`)
      .set("Authorization", bearer(user))
      .send({});
    expect(res.status).to.equal(200);

    const active = await getSessionRepository().count({
      where: { userId: user.id, revokedAt: IsNull() },
    });
    expect(active).to.equal(0);
  });
});
