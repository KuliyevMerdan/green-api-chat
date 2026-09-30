import { describe, expect, it } from 'vitest';
import { formatPhone, normalizePhone, validatePhone } from './phone';

describe('normalizePhone', () => {
  it.each([
    ['+7 (999) 123-45-67', '79991234567'],
    ['8 999 123 45 67', '79991234567'],
    ['+375 29 123-45-67', '375291234567'],
    ['+82 10 123 4567', '82101234567'],
    ['', ''],
  ])('%s → %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });
});

describe('validatePhone', () => {
  describe('MAX', () => {
    it('принимает номера РФ и РБ', () => {
      expect(validatePhone('79991234567', 'max')).toBeNull();
      expect(validatePhone('375291234567', 'max')).toBeNull();
    });

    it.each([
      ['', 'Введите номер телефона'],
      ['7999123', 'Номер должен содержать 11 цифр'],
      ['3752912345', 'Номер должен содержать 12 цифр'],
      ['4915112345678', 'MAX поддерживает только номера России (+7) и Беларуси (+375)'],
    ])('%s → ошибка', (input, message) => {
      expect(validatePhone(input, 'max')).toBe(message);
    });
  });

  describe('Telegram', () => {
    it.each(['79991234567', '4915112345678', '998901234567', '12025550123'])(
      'принимает международный номер %s',
      (input) => {
        expect(validatePhone(input, 'telegram')).toBeNull();
      },
    );

    it.each(['1234567', '1234567890123456'])('отклоняет номер неверной длины %s', (input) => {
      expect(validatePhone(input, 'telegram')).toBe(
        'Введите номер в международном формате, с кодом страны',
      );
    });
  });
});

describe('formatPhone', () => {
  it('форматирует российские и белорусские номера', () => {
    expect(formatPhone('79991234567')).toBe('+7 999 123-45-67');
    expect(formatPhone('375291234567')).toBe('+375 29 123-45-67');
  });

  it('прочие номера возвращает с плюсом как есть', () => {
    expect(formatPhone('4915112345678')).toBe('+4915112345678');
  });
});
