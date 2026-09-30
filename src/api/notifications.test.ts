import { describe, expect, it } from 'vitest';
import { parseNotification } from './notifications';

const senderData = {
  chatId: '10000000',
  chatName: 'Иван Петров',
  chatType: 'user',
  sender: '10000000',
  senderName: 'Иван',
  senderType: 'user',
  senderContactName: 'Иван Петров',
  senderPhoneNumber: 79876543210,
};

const base = {
  instanceData: { idInstance: 3100000000, wid: '79991234567@c.us', typeInstance: 'v3' },
  timestamp: 1763115112,
  idMessage: '1763115112345',
  senderData,
};

describe('parseNotification', () => {
  it('разбирает входящее текстовое сообщение', () => {
    const event = parseNotification({
      ...base,
      typeWebhook: 'incomingMessageReceived',
      messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет' } },
    });

    expect(event).toEqual({
      type: 'message',
      message: {
        id: '1763115112345',
        chatId: '10000000',
        text: 'Привет',
        timestamp: 1763115112000,
        direction: 'incoming',
      },
      chat: { id: '10000000', name: 'Иван Петров', phone: '79876543210' },
    });
  });

  it('разбирает текст со ссылкой (extendedTextMessage)', () => {
    const event = parseNotification({
      ...base,
      typeWebhook: 'incomingMessageReceived',
      messageData: {
        typeMessage: 'extendedTextMessage',
        extendedTextMessageData: { text: 'https://green-api.com' },
      },
    });

    expect(event).toMatchObject({ message: { text: 'https://green-api.com' } });
  });

  it.each(['outgoingAPIMessageReceived', 'outgoingMessageReceived'])(
    'разбирает исходящее сообщение %s без данных собеседника',
    (typeWebhook) => {
      const event = parseNotification({
        ...base,
        typeWebhook,
        messageData: { typeMessage: 'textMessage', textMessage: 'Ответ' },
      });

      expect(event).toEqual({
        type: 'message',
        message: expect.objectContaining({ text: 'Ответ', direction: 'outgoing', status: 'sent' }),
        chat: { id: '10000000' },
      });
    },
  );

  it('помечает нетекстовые сообщения как неподдерживаемые', () => {
    const event = parseNotification({
      ...base,
      typeWebhook: 'incomingMessageReceived',
      messageData: { typeMessage: 'imageMessage', fileMessageData: {} },
    });

    expect(event).toMatchObject({ message: { text: '', unsupported: true } });
  });

  it('разбирает статус исходящего сообщения', () => {
    expect(
      parseNotification({ typeWebhook: 'outgoingMessageStatus', idMessage: 'abc', status: 'read' }),
    ).toEqual({ type: 'status', messageId: 'abc', status: 'read' });

    expect(
      parseNotification({
        typeWebhook: 'outgoingMessageStatus',
        idMessage: 'abc',
        status: 'noAccount',
      }),
    ).toEqual({ type: 'status', messageId: 'abc', status: 'failed' });
  });

  it.each([
    null,
    'строка',
    {},
    { typeWebhook: 'toString' },
    { typeWebhook: 'unknownWebhook' },
    { typeWebhook: 'incomingMessageReceived', senderData: {} },
    { typeWebhook: 'outgoingMessageStatus', idMessage: 'abc', status: 'weird' },
  ])('игнорирует некорректное уведомление %j', (body) => {
    expect(parseNotification(body)).toBeNull();
  });
});
