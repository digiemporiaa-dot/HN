import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

/**
 * Authenticated symmetric encryption for secrets that must be recoverable —
 * currently only TOTP shared secrets, which have to be decrypted to verify a
 * code. Passwords and recovery codes are hashed instead and never come back.
 *
 * AES-256-GCM is used rather than CBC so that tampering with stored ciphertext
 * fails verification instead of silently decrypting to garbage.
 */

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;

/**
 * The key is derived from AUTH_SECRET, so rotating AUTH_SECRET invalidates
 * stored TOTP secrets — staff would need to re-enrol. That is a deliberate
 * trade-off: one secret to manage, and rotation already signs everyone out.
 */
let cachedKey: Buffer | null = null;

function encryptionKey(): Buffer {
  if (cachedKey) return cachedKey;

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required to encrypt two-factor secrets.");
  }

  cachedKey = scryptSync(secret, "hn-medical-2fa-v1", KEY_LENGTH);
  return cachedKey;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return [
    VERSION,
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptSecret(payload: string): string {
  const [version, ivPart, tagPart, dataPart] = payload.split(":");

  if (version !== VERSION || !ivPart || !tagPart || !dataPart) {
    throw new Error("Stored secret is not in a recognised format.");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    encryptionKey(),
    Buffer.from(ivPart, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
