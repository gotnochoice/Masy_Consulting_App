import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Encrypts the single most sensitive field this app stores (the NIN) at the application layer,
// on top of whatever encryption-at-rest the database provider already does on disk -- the spec's
// "documents and NIN encrypted at rest" requirement, for the field that lives in a plain Postgres
// column rather than in blob storage.
//
// NIN_ENCRYPTION_KEY isn't set in every environment yet (this sandbox included), so this fails
// open rather than crashing onboarding: with no key configured, values pass through unencrypted,
// exactly as they did before this existed. Once a key is set in production, every new/updated NIN
// is encrypted; a legacy plaintext value already in the database is still returned correctly by
// decrypt() (it has no "enc:v1:" prefix, so it's passed through unchanged) and becomes encrypted
// the next time it's saved.
const PREFIX = "enc:v1:";

function getKey(): Buffer | null {
  const raw = process.env.NIN_ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    console.error("[encryption] NIN_ENCRYPTION_KEY must decode to exactly 32 bytes; storing unencrypted.");
    return null;
  }
  return key;
}

export function encryptSensitive(plain: string): string {
  const key = getKey();
  if (!key) return plain;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptSensitive(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored;

  const key = getKey();
  if (!key) {
    console.error("[encryption] Encrypted value found but NIN_ENCRYPTION_KEY is not set -- cannot decrypt.");
    return stored;
  }

  const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
