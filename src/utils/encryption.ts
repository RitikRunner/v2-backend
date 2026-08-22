import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";
import { env } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

const encryptionKeysByVersion: Record<number, Buffer> = {
  [env.ENC_KEY_VERSION]: Buffer.from(env.DATA_ENCRYPTION_KEY, "base64"),
};

export const currentEncryptionKeyVersion = env.ENC_KEY_VERSION;

function getEncryptionKeyForVersion(version: number): Buffer {
  const key = encryptionKeysByVersion[version];
  if (!key) {
    throw new Error(`No data encryption key configured for version ${version}`);
  }
  return key;
}

export function encryptPersonalData(
  plaintext: string | null | undefined,
  version = currentEncryptionKeyVersion,
): Buffer | undefined {
  if (!plaintext) return undefined;

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(
    ALGORITHM,
    getEncryptionKeyForVersion(version),
    iv,
  );
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
}

export function decryptPersonalData(payload: Buffer, version: number): string {
  const iv = payload.subarray(0, IV_BYTES);
  const authTag = payload.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES);
  const ciphertext = payload.subarray(IV_BYTES + AUTH_TAG_BYTES);
  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKeyForVersion(version),
    iv,
  );
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

const blindIndexSecretKey = Buffer.from(env.BLIND_INDEX_KEY, "base64");

export function computeBlindIndex(
  value: string | null | undefined,
): Buffer | undefined {
  if (!value) return undefined;
  return createHmac("sha256", blindIndexSecretKey).update(value).digest();
}
