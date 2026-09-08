// apps/api/src/pdf/vnd-to-words.ts
/**
 * Vietnamese number-to-words for VND amounts, standard invoice convention:
 * grouped by 3 digits (triệu/nghìn), "lẻ" fills an internal zero hundreds
 * group, "mười" replaces "một mươi", "mốt"/"lăm"/"tư" replace trailing
 * "một"/"năm"/"bốn" above ten. Deterministic and locale-independent (no
 * Intl reliance) so PDF output stays byte-stable across environments.
 */

const DIGITS_VI = [
  'không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín',
] as const;

const GROUP_UNITS = ['', 'nghìn', 'triệu', 'tỷ'] as const;

function readThreeDigits(group: number, isFirstGroup: boolean): string {
  const hundreds = Math.floor(group / 100);
  const tens = Math.floor((group % 100) / 10);
  const ones = group % 10;
  const parts: string[] = [];

  if (hundreds > 0 || !isFirstGroup) {
    parts.push(DIGITS_VI[hundreds], 'trăm');
  }

  if (tens === 0) {
    if (ones > 0 && (hundreds > 0 || !isFirstGroup)) {
      parts.push('lẻ');
    }
  } else if (tens === 1) {
    parts.push('mười');
  } else {
    parts.push(DIGITS_VI[tens], 'mươi');
  }

  if (ones === 1 && tens >= 2) {
    parts.push('mốt');
  } else if (ones === 5 && tens >= 1) {
    parts.push('lăm');
  } else if (ones === 4 && tens >= 2) {
    parts.push('tư');
  } else if (ones > 0) {
    parts.push(DIGITS_VI[ones]);
  }

  return parts.join(' ');
}

export function vndAmountToWords(amountVnd: number): string {
  const value = Math.floor(Math.max(0, amountVnd));
  if (value === 0) {
    return 'Không đồng';
  }

  const groups: number[] = [];
  let remaining = value;
  while (remaining > 0) {
    groups.unshift(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const words: string[] = [];
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    if (group === 0) continue;
    const isFirstGroup = i === 0;
    const unit = GROUP_UNITS[groups.length - 1 - i];
    words.push(readThreeDigits(group, isFirstGroup));
    if (unit) words.push(unit);
  }

  const sentence = words.join(' ').replace(/\s+/g, ' ').trim();
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)} đồng`;
}
