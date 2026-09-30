import { describe, expect, it } from 'vitest';
import { parseRecipient } from './recipient';

describe('parseRecipient', () => {
  it('в Telegram распознаёт username с «@» и без', () => {
    expect(parseRecipient('@Durov_Team', 'telegram')).toEqual({
      ok: true,
      recipient: { kind: 'username', username: '@Durov_Team' },
    });
    expect(parseRecipient('  john_doe ', 'telegram')).toEqual({
      ok: true,
      recipient: { kind: 'username', username: '@john_doe' },
    });
  });

  it('в Telegram принимает номер любой страны', () => {
    expect(parseRecipient('+49 151 1234 5678', 'telegram')).toEqual({
      ok: true,
      recipient: { kind: 'phone', phone: '4915112345678' },
    });
  });

  it.each(['@abc', '@1username', '@имя_пользователя'])(
    'в Telegram отклоняет некорректный username %s',
    (input) => {
      expect(parseRecipient(input, 'telegram')).toMatchObject({ ok: false });
    },
  );

  it('в MAX не принимает username и иностранные номера', () => {
    expect(parseRecipient('@john_doe', 'max')).toMatchObject({ ok: false });
    expect(parseRecipient('+49 151 1234 5678', 'max')).toEqual({
      ok: false,
      error: 'MAX поддерживает только номера России (+7) и Беларуси (+375)',
    });
  });
});
