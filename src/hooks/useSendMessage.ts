import { useCallback } from 'react';
import { useGreenApi } from '../api/GreenApiContext';
import { useChatStore } from '../store/chatStore';

export const MAX_MESSAGE_LENGTH = 4000;

/**
 * Оптимистичная отправка: сообщение сразу появляется в ленте со статусом `pending`,
 * после ответа API получает настоящий idMessage или статус `failed`.
 */
export function useSendMessage() {
  const client = useGreenApi();

  const send = useCallback(
    async (chatId: string, text: string) => {
      const { addPendingMessage, confirmMessage, failMessage } = useChatStore.getState();
      const localId = addPendingMessage(chatId, text);
      try {
        const { idMessage } = await client.sendMessage({ chatId, message: text });
        confirmMessage(chatId, localId, idMessage);
      } catch (error) {
        console.error('Не удалось отправить сообщение', error);
        failMessage(chatId, localId);
      }
    },
    [client],
  );

  const retry = useCallback(
    (chatId: string, messageId: string, text: string) => {
      useChatStore.getState().removeMessage(chatId, messageId);
      return send(chatId, text);
    },
    [send],
  );

  return { send, retry };
}
