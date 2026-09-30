import type { InstanceType } from '../domain/instance';
import { normalizePhone, validatePhone } from './phone';

export type Recipient = { kind: 'phone'; phone: string } | { kind: 'username'; username: string };

export type ParseRecipientResult =
  { ok: true; recipient: Recipient } | { ok: false; error: string };

/** Имя пользователя Telegram: 5–32 символа, латиница, цифры и «_», начинается с буквы. */
const TELEGRAM_USERNAME = /^[a-z][a-z0-9_]{4,31}$/i;

/**
 * Разбирает ввод в поле «кому»: номер телефона, а для Telegram ещё и `@username`
 * (с «@» или без, если в строке есть буквы).
 */
export function parseRecipient(input: string, instanceType: InstanceType): ParseRecipientResult {
  const value = input.trim();
  const looksLikeUsername = value.startsWith('@') || /[a-z_]/i.test(value);

  if (instanceType === 'telegram' && looksLikeUsername) {
    const name = value.replace(/^@/, '');
    return TELEGRAM_USERNAME.test(name)
      ? { ok: true, recipient: { kind: 'username', username: `@${name}` } }
      : { ok: false, error: 'Username: 5–32 символа — латиница, цифры и «_»' };
  }

  const phone = normalizePhone(value);
  const error = validatePhone(phone, instanceType);
  return error ? { ok: false, error } : { ok: true, recipient: { kind: 'phone', phone } };
}
