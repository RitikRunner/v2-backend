import { expect } from "chai";
import { normalizeEmail, normalizePhone } from "../../utils/normalize";

describe("normalizePhone", () => {
  it("normalizes an Indian number to E.164, returns correct country code and flags as domestic", () => {
    const result = normalizePhone("9810012345");
    expect(result).to.not.equal(null);
    expect(result?.e164).to.equal("+919810012345");
    expect(result?.countryCode).to.equal("IN");
    expect(result?.isInternational).to.equal(false);
  });

  it("flags a US number as international and returns correct country code", () => {
    const result = normalizePhone("+16502530000");
    expect(result).to.not.equal(null);
    expect(result?.countryCode).to.equal("US");
    expect(result?.isInternational).to.equal(true);
  });

  it("flags a UAE number as international and returns correct country code", () => {
    const result = normalizePhone("+971501234567");
    expect(result).to.not.equal(null);
    expect(result?.countryCode).to.equal("AE");
    expect(result?.isInternational).to.equal(true);
  });

  it("returns null for an invalid number", () => {
    expect(normalizePhone("123")).to.equal(null);
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Foo@Example.COM ")).to.equal("foo@example.com");
  });
});
