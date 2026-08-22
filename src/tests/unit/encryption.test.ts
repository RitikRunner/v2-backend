import { expect } from "chai";
import {
  computeBlindIndex,
  currentEncryptionKeyVersion,
  decryptPersonalData,
  encryptPersonalData,
} from "../../utils/encryption";

describe("encryption", () => {
  it("round-trips plaintext through encrypt and decrypt", () => {
    const secret = "+919810012345";
    const payload = encryptPersonalData(secret)!;
    expect(payload).to.be.instanceOf(Buffer);
    expect(payload.toString("utf8")).to.not.contain(secret);
    expect(decryptPersonalData(payload, currentEncryptionKeyVersion)).to.equal(
      secret,
    );
  });

  it("produces distinct ciphertext for identical plaintext", () => {
    const a = encryptPersonalData("hello")!;
    const b = encryptPersonalData("hello")!;
    expect(a.equals(b)).to.equal(false);
    expect(decryptPersonalData(a, currentEncryptionKeyVersion)).to.equal(
      "hello",
    );
    expect(decryptPersonalData(b, currentEncryptionKeyVersion)).to.equal(
      "hello",
    );
  });

  it("rejects tampered ciphertext via the GCM auth tag", () => {
    const payload = encryptPersonalData("sensitive")!;
    payload[payload.length - 1] ^= 0xff;
    expect(() =>
      decryptPersonalData(payload, currentEncryptionKeyVersion),
    ).to.throw();
  });

  it("throws when decrypting with an unconfigured key version", () => {
    const payload = encryptPersonalData("data")!;
    expect(() => decryptPersonalData(payload, 999)).to.throw(/version 999/);
  });

  it("computes a deterministic, keyed 32-byte blind index", () => {
    const a = computeBlindIndex("+919810012345")!;
    const b = computeBlindIndex("+919810012345")!;
    const c = computeBlindIndex("+919820012345")!;
    expect(a.equals(b)).to.equal(true);
    expect(a.equals(c)).to.equal(false);
    expect(a.length).to.equal(32);
  });
});
