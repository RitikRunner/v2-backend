import { expect } from "chai";
import { generateNumericOtp, sha256 } from "../../utils/crypto";

describe("generateNumericOtp", () => {
  it("returns a zero-padded numeric string of the requested length", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateNumericOtp(6)).to.match(/^\d{6}$/);
      expect(generateNumericOtp(4)).to.match(/^\d{4}$/);
    }
  });
});

describe("sha256", () => {
  it("is stable, hex-encoded, and collision-sensitive", () => {
    expect(sha256("a")).to.equal(sha256("a"));
    expect(sha256("a")).to.match(/^[0-9a-f]{64}$/);
    expect(sha256("a")).to.not.equal(sha256("b"));
  });
});
