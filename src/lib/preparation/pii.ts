/**
 * PII detection and masking (diagram card H — "PII maskeleme").
 *
 * Detectors validate checksums where the format has one (TCKN, IBAN, card
 * numbers via Luhn) so that random digit runs are not masked as PII.
 */

export type PiiType = "email" | "phone" | "tckn" | "iban" | "credit_card" | "ip_address";

export interface PiiMatch {
  type: PiiType;
  start: number;
  end: number;
  value: string;
}

export function isValidTckn(value: string): boolean {
  if (!/^[1-9]\d{10}$/.test(value)) return false;
  const d = value.split("").map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const d10 = (((odd * 7 - even) % 10) + 10) % 10;
  const d11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return d[9] === d10 && d[10] === d11;
}

export function isValidLuhn(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

export function isValidIban(value: string): boolean {
  const iban = value.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const code = char >= "A" && char <= "Z" ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of code) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

const DETECTORS: Array<{ type: PiiType; pattern: RegExp; validate?: (v: string) => boolean }> = [
  { type: "email", pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { type: "iban", pattern: /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){2,7}(?:\s?[A-Z0-9]{1,4})?\b/g, validate: isValidIban },
  { type: "credit_card", pattern: /\b(?:\d[ -]?){13,19}\b/g, validate: isValidLuhn },
  { type: "tckn", pattern: /\b[1-9]\d{10}\b/g, validate: isValidTckn },
  { type: "phone", pattern: /(?:\+90[\s-]?|\b0)?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}\b/g },
  { type: "ip_address", pattern: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g },
];

export function detectPii(text: string): PiiMatch[] {
  const matches: PiiMatch[] = [];
  for (const detector of DETECTORS) {
    for (const match of text.matchAll(detector.pattern)) {
      const value = match[0].trim();
      if (detector.validate && !detector.validate(value)) continue;
      const start = match.index ?? 0;
      const end = start + match[0].length;
      // Earlier detectors win on overlap (e.g. IBAN digits are not re-matched as a card).
      if (matches.some((m) => start < m.end && end > m.start)) continue;
      matches.push({ type: detector.type, start, end, value });
    }
  }
  return matches.sort((a, b) => a.start - b.start);
}

export function maskPii(text: string): { text: string; matches: PiiMatch[] } {
  const matches = detectPii(text);
  let result = "";
  let cursor = 0;
  for (const match of matches) {
    result += text.slice(cursor, match.start) + `[${match.type.toUpperCase()}]`;
    cursor = match.end;
  }
  result += text.slice(cursor);
  return { text: result, matches };
}
