import { scryptSync, timingSafeEqual } from "node:crypto";

const HASH_ALGORITHM = "scrypt";
const HASH_KEY_LENGTH = 64;

export function hashPassword(password: string, salt: string) {
  const digest = scryptSync(password, salt, HASH_KEY_LENGTH).toString("hex");

  return `${HASH_ALGORITHM}$${salt}$${digest}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, digest] = storedHash.split("$");

  if (algorithm !== HASH_ALGORITHM || !salt || !digest) {
    return false;
  }

  const actualDigest = hashPassword(password, salt).split("$")[2];

  if (!actualDigest) {
    return false;
  }

  const actual = Buffer.from(actualDigest, "hex");
  const expected = Buffer.from(digest, "hex");

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}
