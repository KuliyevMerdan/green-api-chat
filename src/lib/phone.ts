import type { InstanceType } from '../domain/instance';

/** Коды стран, для которых GREEN-API MAX поддерживает поиск по номеру (РФ и РБ). */
const MAX_PHONE_RULES = [
  { code: '375', length: 12 },
  { code: '7', length: 11 },
] as const;

/** Длина номера по E.164 с кодом страны. */
const MIN_INTERNATIONAL_LENGTH = 8;
const MAX_INTERNATIONAL_LENGTH = 15;

/**
 * Оставляет только цифры. Российский «8XXXXXXXXXX» без плюса приводит к «7XXXXXXXXXX»;
 * с явным «+» номер не трогаем — это может быть код другой страны.
 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  const hasPlus = input.trim().startsWith('+');
  return !hasPlus && digits.length === 11 && digits.startsWith('8')
    ? `7${digits.slice(1)}`
    : digits;
}

/** Возвращает текст ошибки или `null`, если номер корректен для мессенджера. */
export function validatePhone(digits: string, instanceType: InstanceType): string | null {
  if (digits === '') return 'Введите номер телефона';

  if (instanceType === 'telegram') {
    const isValidLength =
      digits.length >= MIN_INTERNATIONAL_LENGTH && digits.length <= MAX_INTERNATIONAL_LENGTH;
    return isValidLength ? null : 'Введите номер в международном формате, с кодом страны';
  }

  const rule = MAX_PHONE_RULES.find(({ code }) => digits.startsWith(code));
  if (!rule) return 'MAX поддерживает только номера России (+7) и Беларуси (+375)';
  if (digits.length !== rule.length) return `Номер должен содержать ${rule.length} цифр`;
  return null;
}

/** «79991234567» → «+7 999 123-45-67», «375291234567» → «+375 29 123-45-67», прочие → «+…». */
export function formatPhone(digits: string): string {
  const match =
    /^(7)(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(digits) ??
    /^(375)(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(digits);
  if (!match) return digits ? `+${digits}` : '';
  const [, code, operator, a, b, c] = match;
  return `+${code} ${operator} ${a}-${b}-${c}`;
}
