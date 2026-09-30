import { useEffect, useState } from 'react';
import { useGreenApi } from '../api/GreenApiContext';
import { parseNotification } from '../api/notifications';
import { runNotificationPolling, type ConnectionStatus } from '../api/polling';
import { useChatStore } from '../store/chatStore';

function handleNotification(body: unknown): void {
  const event = parseNotification(body);
  if (!event) return;
  const store = useChatStore.getState();
  if (event.type === 'message') store.receiveMessage(event.message, event.chat);
  else if (event.type === 'status') store.updateMessageStatus(event.messageId, event.status);
}

/** Запускает получение уведомлений на время жизни компонента и отдаёт статус соединения. */
export function useNotificationPolling(): ConnectionStatus {
  const client = useGreenApi();
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  useEffect(() => {
    const controller = new AbortController();
    void runNotificationPolling({
      client,
      onNotification: handleNotification,
      onStatusChange: setStatus,
      signal: controller.signal,
    });
    return () => controller.abort();
  }, [client]);

  return status;
}
