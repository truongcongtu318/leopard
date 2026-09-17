export interface FormattedPhone {
  display: string;
  rawDigits: string;
  isValid: boolean;
}

export function formatVietnamPhoneNumber(input: string): FormattedPhone {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('84')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  const cleanDigits = digits.slice(0, 9);

  let formatted = '';
  if (cleanDigits.length > 0) {
    formatted = cleanDigits.slice(0, 2);
    if (cleanDigits.length > 2) {
      formatted += ' ' + cleanDigits.slice(2, 5);
      if (cleanDigits.length > 5) {
        formatted += ' ' + cleanDigits.slice(5, 9);
      }
    }
  }

  const isValid = cleanDigits.length === 9 && ['3', '5', '7', '8', '9'].includes(cleanDigits[0] ?? '');
  return {
    display: formatted,
    rawDigits: cleanDigits,
    isValid,
  };
}
