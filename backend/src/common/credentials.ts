import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Generates ERP login credentials for a newly onboarded employee.
 *
 * There is no Google Workspace mailbox yet (on hold per team decision), so
 * these are the account's only way in: a username derived from their name,
 * and a random password shown to HR exactly once at creation time.
 */

function slug(part: string): string {
  return part
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining accents (e.g. é -> e)
    .replace(/[^a-z0-9]/g, '');
}

/** firstname.lastname, deduplicated with a numeric suffix on collision. */
export async function generateUsername(
  prisma: PrismaService,
  firstName: string,
  lastName: string,
): Promise<string> {
  const base = `${slug(firstName)}.${slug(lastName)}` || 'employee';

  for (let suffix = 0; suffix < 1000; suffix++) {
    const candidate = suffix === 0 ? base : `${base}${suffix + 1}`;
    const clash = await prisma.user.findUnique({ where: { username: candidate } });
    if (!clash) return candidate;
  }
  // Practically unreachable, but never loop forever.
  return `${base}.${Date.now()}`;
}

const AMBIGUOUS = new Set(['0', 'O', 'o', '1', 'l', 'I']);
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O
const LOWER = 'abcdefghijkmnpqrstuvwxyz'; // no l/o
const DIGIT = '23456789'; // no 0/1
const SYMBOL = '!@#$%&*';
const ALL = UPPER + LOWER + DIGIT + SYMBOL;

function randomFrom(alphabet: string): string {
  return alphabet[crypto.randomInt(alphabet.length)];
}

/** 12 characters, guaranteed one of each class, no visually ambiguous glyphs. */
export function generateTemporaryPassword(): string {
  const required = [randomFrom(UPPER), randomFrom(LOWER), randomFrom(DIGIT), randomFrom(SYMBOL)];
  const rest = Array.from({ length: 8 }, () => randomFrom(ALL));

  const chars = [...required, ...rest];
  // Fisher-Yates, so the required characters aren't always in the same positions.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  const pwd = chars.join('');
  // Belt and braces — the alphabets above exclude these, but assert it.
  if ([...pwd].some((c) => AMBIGUOUS.has(c))) return generateTemporaryPassword();
  return pwd;
}
