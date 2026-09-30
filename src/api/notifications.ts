import type { ChatInfo, Message, MessageStatus } from '../domain/chat';

export type ChatEvent =
  | { type: 'message'; message: Message; chat: ChatInfo }
  | { type: 'status'; messageId: string; status: MessageStatus }
  | { type: 'instanceState'; state: string };

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : undefined;
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string' && value !== '') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

/** GREEN-API передаёт время в секундах. */
function toMilliseconds(timestamp: unknown): number {
  return typeof timestamp === 'number' && timestamp > 0 ? timestamp * 1000 : Date.now();
}

/**
 * Достаёт текст из `messageData`. Входящие и исходящие уведомления кладут текст
 * в разные поля, поэтому проверяем все известные варианты.
 */
export function extractText(messageData: UnknownRecord): string | undefined {
  const textData = asRecord(messageData.textMessageData);
  const extendedData = asRecord(messageData.extendedTextMessageData);
  return (
    asString(textData?.textMessage) ??
    asString(extendedData?.text) ??
    asString(messageData.textMessage)
  );
}

const TEXT_MESSAGE_TYPES = new Set(['textMessage', 'extendedTextMessage', 'quotedMessage']);

const DIRECTION_BY_WEBHOOK = {
  incomingMessageReceived: 'incoming',
  outgoingMessageReceived: 'outgoing',
  outgoingAPIMessageReceived: 'outgoing',
} as const;

const STATUS_MAP: Partial<Record<string, MessageStatus>> = {
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
  failed: 'failed',
  noAccount: 'failed',
  notInGroup: 'failed',
  yellowCard: 'failed',
};

function parseMessage(body: UnknownRecord, direction: Message['direction']): ChatEvent | null {
  const senderData = asRecord(body.senderData);
  const messageData = asRecord(body.messageData);
  const id = asString(body.idMessage);
  const chatId = asString(senderData?.chatId);
  if (!senderData || !messageData || !id || !chatId) return null;

  const typeMessage = asString(messageData.typeMessage) ?? '';
  const text = TEXT_MESSAGE_TYPES.has(typeMessage) ? extractText(messageData) : undefined;

  const message: Message = {
    id,
    chatId,
    text: text ?? '',
    timestamp: toMilliseconds(body.timestamp),
    direction,
  };
  if (text === undefined) message.unsupported = true;
  if (direction === 'outgoing') message.status = 'sent';

  // В исходящих senderData описывает нас самих, поэтому данные собеседника берём только из входящих.
  const chat: ChatInfo = { id: chatId };
  if (direction === 'incoming') {
    const name =
      asString(senderData.senderContactName) ??
      asString(senderData.chatName) ??
      asString(senderData.senderName);
    const phone = asString(senderData.senderPhoneNumber);
    if (name) chat.name = name;
    if (phone && phone !== '0') chat.phone = phone;
  }

  return { type: 'message', message, chat };
}

/** Превращает сырое уведомление GREEN-API в событие чата. Неизвестные уведомления → `null`. */
export function parseNotification(rawBody: unknown): ChatEvent | null {
  const body = asRecord(rawBody);
  const typeWebhook = asString(body?.typeWebhook);
  if (!body || !typeWebhook) return null;

  if (Object.hasOwn(DIRECTION_BY_WEBHOOK, typeWebhook)) {
    const direction = DIRECTION_BY_WEBHOOK[typeWebhook as keyof typeof DIRECTION_BY_WEBHOOK];
    return parseMessage(body, direction);
  }

  if (typeWebhook === 'outgoingMessageStatus') {
    const messageId = asString(body.idMessage);
    const status = STATUS_MAP[asString(body.status) ?? ''];
    return messageId && status ? { type: 'status', messageId, status } : null;
  }

  if (typeWebhook === 'stateInstanceChanged') {
    const state = asString(body.stateInstance);
    return state ? { type: 'instanceState', state } : null;
  }

  return null;
}
