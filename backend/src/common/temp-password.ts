import * as crypto from 'crypto';

/**
 * A 12-character temporary password for a new or returning account. No
 * look-alike characters (0/O, 1/l/I) — it is read off a printed list. At least
 * two letters and two digits, so it passes the change-password rules' shape.
 */
export function tempPassword(): string {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = letters + digits;
  const pick = (set: string) => set[crypto.randomInt(set.length)];
  const chars = [pick(letters), pick(letters), pick(digits), pick(digits)];
  while (chars.length < 12) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join('');
}
