import { beforeEach, describe, expect, it } from 'vitest';
import type { Message } from '../domain/chat';
import { useChatStore } from './chatStore';

const CHAT_ID = '10000000';

function incoming(id: string, timestamp: number, text = 'Привет'): Message {
  return { id, chatId: CHAT_ID, text, timestamp, direction: 'incoming' };
}

const store = () => useChatStore.getState();
const messages = () => store().messages[CHAT_ID] ?? [];

beforeEach(() => {
  store().bindOwner('owner-a');
  store().bindOwner('owner-b');
});

describe('chatStore', () => {
  it('создаёт чат из входящего сообщения и считает непрочитанные', () => {
    store().receiveMessage(incoming('m1', 1000), { id: CHAT_ID, name: 'Иван' });

    expect(store().chats[CHAT_ID]).toMatchObject({
      name: 'Иван',
      unreadCount: 1,
      lastMessage: { text: 'Привет', direction: 'incoming' },
    });
  });

  it('не дублирует сообщение при повторном уведомлении', () => {
    store().receiveMessage(incoming('m1', 1000), { id: CHAT_ID });
    store().receiveMessage(incoming('m1', 1000), { id: CHAT_ID });

    expect(messages()).toHaveLength(1);
  });

  it('сохраняет порядок по времени', () => {
    store().receiveMessage(incoming('m2', 2000), { id: CHAT_ID });
    store().receiveMessage(incoming('m1', 1000), { id: CHAT_ID });

    expect(messages().map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(store().chats[CHAT_ID]?.lastMessage?.timestamp).toBe(2000);
  });

  it('не увеличивает счётчик для открытого чата и сбрасывает его при открытии', () => {
    store().receiveMessage(incoming('m1', 1000), { id: CHAT_ID });
    store().openChat({ id: CHAT_ID });
    store().receiveMessage(incoming('m2', 2000), { id: CHAT_ID });

    expect(store().chats[CHAT_ID]?.unreadCount).toBe(0);
  });

  it('подтверждает отправленное сообщение настоящим idMessage', () => {
    const localId = store().addPendingMessage(CHAT_ID, 'Исходящее');
    expect(messages()[0]).toMatchObject({ id: localId, status: 'pending' });

    store().confirmMessage(CHAT_ID, localId, 'real-id');

    expect(messages()).toEqual([expect.objectContaining({ id: 'real-id', status: 'sent' })]);
  });

  it('убирает локальную копию, если уведомление пришло раньше ответа API', () => {
    const localId = store().addPendingMessage(CHAT_ID, 'Исходящее');
    store().receiveMessage(
      {
        id: 'real-id',
        chatId: CHAT_ID,
        text: 'Исходящее',
        timestamp: Date.now(),
        direction: 'outgoing',
        status: 'sent',
      },
      { id: CHAT_ID },
    );

    store().confirmMessage(CHAT_ID, localId, 'real-id');

    expect(messages().map((m) => m.id)).toEqual(['real-id']);
  });

  it('не понижает статус сообщения', () => {
    const localId = store().addPendingMessage(CHAT_ID, 'Текст');
    store().confirmMessage(CHAT_ID, localId, 'id-1');

    store().updateMessageStatus('id-1', 'read');
    store().updateMessageStatus('id-1', 'delivered');

    expect(messages()[0]?.status).toBe('read');
  });

  it('сбрасывает историю при входе под другим инстансом', () => {
    store().receiveMessage(incoming('m1', 1000), { id: CHAT_ID });
    store().bindOwner('owner-b');
    expect(messages()).toHaveLength(1);

    store().bindOwner('owner-c');
    expect(store().chats).toEqual({});
    expect(store().messages).toEqual({});
  });
});
