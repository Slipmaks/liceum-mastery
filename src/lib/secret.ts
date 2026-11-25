// Hashing for passwords and PINs (scrypt). Session tokens use plain SHA-256: they are random, not guessable.
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (secret: string, salt: Buffer, len: number) => Promise<Buffer>;

/** Returns "salt.key", both base64url. */
export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(secret, salt, 32);
  return `${salt.toString("base64url")}.${key.toString("base64url")}`;
}

export async function verifySecret(secret: string, stored: string): Promise<boolean> {
  const [salt, key] = stored.split(".");
  if (!salt || !key) return false;
  const expected = Buffer.from(key, "base64url");
  const actual = await scryptAsync(secret, Buffer.from(salt, "base64url"), expected.length);
  return timingSafeEqual(actual, expected);
}
