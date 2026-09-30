import type { Chat } from '../domain/chat';
import { formatPhone } from './phone';

// Форматтеры Intl дорого создавать — переиспользуем экземпляры.
const timeFormatter = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const shortDateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
const fullDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const dayFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatTime(timestamp: number): string {
  return timeFormatter.format(timestamp);
}

/** Время для списка чатов: сегодня — часы, иначе — дата. */
export function formatChatListTime(timestamp: number, now: Date = new Date()): string {
  const date = new Date(timestamp);
  return isSameDay(date, now) ? timeFormatter.format(date) : shortDateFormatter.format(date);
}

/** Заголовок-разделитель дня в ленте сообщений. */
export function formatDayLabel(timestamp: number, now: Date = new Date()): string {
  const date = new Date(timestamp);
  if (isSameDay(date, now)) return 'Сегодня';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Вчера';
  return date.getFullYear() === now.getFullYear()
    ? dayFormatter.format(date)
    : fullDateFormatter.format(date);
}

export function getDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

type ChatIdentity = Pick<Chat, 'id' | 'name' | 'phone' | 'username'>;

export function getChatTitle(chat: ChatIdentity): string {
  return chat.name ?? chat.username ?? (chat.phone ? formatPhone(chat.phone) : `Чат ${chat.id}`);
}

/** Инициалы для аватара: «Иван Петров» → «ИП». */
export function getInitials(title: string): string {
  const words = title
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim()
    .split(/\s+/);
  const initials = words
    .slice(0, 2)
    .map((word) => word[0] ?? '')
    .join('');
  return initials.toUpperCase() || '?';
}

/** Вторая строка в шапке чата: то, что не попало в заголовок, либо название мессенджера. */
export function getChatSubtitle(chat: ChatIdentity, fallback: string): string {
  const title = getChatTitle(chat);
  const phone = chat.phone ? formatPhone(chat.phone) : undefined;
  return [chat.username, phone].find((value) => value && value !== title) ?? fallback;
}
