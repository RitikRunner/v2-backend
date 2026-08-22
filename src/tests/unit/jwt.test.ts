import { expect } from "chai";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { signAccessToken, verifyAccessToken } from "../../utils/jwt";

describe("access tokens", () => {
  it("signs and verifies a payload round-trip", () => {
    const token = signAccessToken({ sub: 7, role: "admin" });
    const payload = verifyAccessToken(token);
    expect(payload.sub).to.equal(7);
    expect(payload.role).to.equal("admin");
  });

  it("rejects a token signed with a different secret", () => {
    const forged = jwt.sign({ sub: 1, role: "admin" }, "wrong-secret");
    expect(() => verifyAccessToken(forged)).to.throw();
  });

  it("rejects an expired token", () => {
    const expired = jwt.sign({ sub: 1, role: "admin" }, env.JWT_ACCESS_SECRET, {
      expiresIn: -10,
    });
    expect(() => verifyAccessToken(expired)).to.throw();
  });
});
