import { expect } from "chai";
import { toLeadDto } from "../../dtos/lead-dto";
import { Lead } from "../../entities/Lead";
import {
  computeBlindIndex,
  currentEncryptionKeyVersion,
  encryptPersonalData,
} from "../../utils/encryption";

function buildLead(): Lead {
  const lead = new Lead();
  Object.assign(lead, {
    id: 1,
    publicId: "11111111-1111-1111-1111-111111111111",
    name: "Jane Doe",
    phoneEnc: encryptPersonalData("+919876543210"),
    phoneHash: computeBlindIndex("+919876543210"),
    emailEnc: encryptPersonalData("jane@example.com"),
    emailHash: computeBlindIndex("jane@example.com"),
    encKeyVersion: currentEncryptionKeyVersion,
  });
  return lead;
}

describe("toLeadDto", () => {
  it("decrypts PII for authorized responses", () => {
    const lead = buildLead();
    const dto = toLeadDto(lead);
    expect(dto.id).to.equal(1);
    expect(dto.name).to.equal("Jane Doe");
    expect(dto.phone).to.equal("+919876543210");
    expect(dto.email).to.equal("jane@example.com");
  });

  it("never exposes ciphertext, blind-index hashes, or the key version", () => {
    const dto = toLeadDto(buildLead());
    const leaked = Object.keys(dto).filter(
      (key) =>
        key.endsWith("Enc") || key.endsWith("Hash") || key === "encKeyVersion",
    );
    expect(leaked).to.deep.equal([]);
  });
});
