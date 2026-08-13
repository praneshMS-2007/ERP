import { BadRequestException } from '@nestjs/common';

/**
 * Indian statutory identifier formats.
 *
 * These exist because the May 2026 payslip had PAN and bank account swapped —
 * an 11-digit account number printed as a PAN. Validating on write means the
 * two can never be entered into each other's field again.
 */

/** Permanent Account Number: 5 letters, 4 digits, 1 letter. e.g. QCKPS2002C */
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** IFSC: 4 letters, 0, then 6 alphanumerics. e.g. HDFC0001234 */
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** Indian bank account numbers run 9–18 digits across banks. */
const BANK_ACCOUNT_RE = /^[0-9]{9,18}$/;

/**
 * Aadhaar: exactly 12 digits. This checks the shape only, not the official
 * Verhoeff checksum UIDAI uses internally — good enough to catch a
 * mistyped/wrong-length number, not a guarantee the number is real.
 */
const AADHAAR_RE = /^[0-9]{12}$/;

export function normalisePan(input: string): string {
  const pan = input.trim().toUpperCase();

  if (!PAN_RE.test(pan)) {
    // Name the likely mistake rather than just rejecting.
    if (BANK_ACCOUNT_RE.test(pan)) {
      throw new BadRequestException(
        'That looks like a bank account number, not a PAN. A PAN is 5 letters, ' +
          '4 digits, then 1 letter — for example QCKPS2002C.',
      );
    }
    throw new BadRequestException(
      `"${pan}" is not a valid PAN. The format is 5 letters, 4 digits, then 1 letter — ` +
        'for example QCKPS2002C.',
    );
  }
  return pan;
}

export function normaliseBankAccount(input: string): string {
  const acc = input.trim().replace(/[\s-]/g, '');

  if (!BANK_ACCOUNT_RE.test(acc)) {
    if (PAN_RE.test(acc.toUpperCase())) {
      throw new BadRequestException(
        'That looks like a PAN, not a bank account number. Bank account numbers ' +
          'are 9 to 18 digits.',
      );
    }
    throw new BadRequestException(
      'A bank account number must be 9 to 18 digits, with no letters.',
    );
  }
  return acc;
}

export function normaliseIfsc(input: string): string {
  const ifsc = input.trim().toUpperCase();
  if (!IFSC_RE.test(ifsc)) {
    throw new BadRequestException(
      `"${ifsc}" is not a valid IFSC code. The format is 4 letters, then 0, then ` +
        '6 characters — for example HDFC0001234.',
    );
  }
  return ifsc;
}

export function normaliseAadhaar(input: string): string {
  const aadhaar = input.trim().replace(/[\s-]/g, '');
  if (!AADHAAR_RE.test(aadhaar)) {
    throw new BadRequestException('An Aadhaar number must be exactly 12 digits, with no letters.');
  }
  return aadhaar;
}

/**
 * UAN (EPFO Universal Account Number): exactly 12 digits — structurally
 * identical to Aadhaar. There is no public rule that distinguishes a valid
 * UAN from a valid Aadhaar by shape alone, so unlike normalisePan/
 * normaliseBankAccount above, this cannot detect the two being swapped.
 * The mitigation is keeping them in clearly separate, clearly labelled
 * fields — not a format check.
 */
const UAN_RE = /^[0-9]{12}$/;

export function normaliseUan(input: string): string {
  const uan = input.trim().replace(/[\s-]/g, '');
  if (!UAN_RE.test(uan)) {
    throw new BadRequestException('A UAN must be exactly 12 digits, with no letters.');
  }
  return uan;
}

/**
 * ESIC numbers vary in length across schemes and eras (commonly 10 or 17
 * digits) and there is no single canonical public format to check against
 * confidently. This only rejects obviously-wrong input (too short, or
 * containing anything but digits) rather than asserting an exact length —
 * a wrong strict rule would reject real ESIC numbers, which is worse than a
 * loose one that lets a typo through.
 */
const ESIC_RE = /^[0-9]{9,17}$/;

export function normaliseEsic(input: string): string {
  const esic = input.trim().replace(/[\s-]/g, '');
  if (!ESIC_RE.test(esic)) {
    throw new BadRequestException('An ESIC number should be 9 to 17 digits, with no letters.');
  }
  return esic;
}

/** Loose but useful: catches typos without rejecting unusual real addresses. */
export function normaliseEmail(input: string): string {
  const email = input.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BadRequestException(`"${input}" is not a valid email address.`);
  }
  return email;
}
