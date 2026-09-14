import bcrypt from "bcryptjs";

/**
 * Cost 12 is the current sensible balance for interactive logins — roughly
 * 250ms on typical VPS hardware, which is slow enough to matter to an attacker
 * and fast enough not to be noticed by staff.
 */
const BCRYPT_COST = 12;

export function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_COST);
}

export function verifyPassword(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

/**
 * A hash of a value nobody knows, compared against when the submitted email has
 * no account. Without this, a missing account returns noticeably faster than a
 * wrong password and the response time alone enumerates valid addresses.
 */
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.7Nl9PGKqKQFsrZ9Ea.2Zt/6K4nqsKGO";

export async function burnPasswordComparison(plaintext: string): Promise<void> {
  await bcrypt.compare(plaintext, DUMMY_HASH);
}
