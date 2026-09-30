import { GreenApiError, RECEIVE_TIMEOUT_SEC, type GreenApiClient } from './greenApiClient';

export type ConnectionStatus = 'connecting' | 'online' | 'reconnecting' | 'unauthorized';

export interface PollingOptions {
  client: Pick<GreenApiClient, 'receiveNotification' | 'deleteNotification'>;
  /** Обработчик тела уведомления. Исключение не прерывает цикл. */
  onNotification: (body: unknown) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  signal: AbortSignal;
  receiveTimeoutSec?: number;
}

const MAX_BACKOFF_MS = 30_000;

/** Экспоненциальная задержка с джиттером: 1s, 2s, 4s … до 30s. */
export function getBackoffDelay(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(1000 * 2 ** Math.max(attempt - 1, 0), MAX_BACKOFF_MS);
  return Math.round(base * (0.75 + random() * 0.5));
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    }
    signal.addEventListener('abort', done, { once: true });
  });
}

/**
 * Цикл получения уведомлений по HTTP API: receiveNotification (long polling) →
 * обработка → deleteNotification. Работает, пока не будет отменён `signal`
 * или сервер не отклонит учётные данные.
 */
export async function runNotificationPolling({
  client,
  onNotification,
  onStatusChange,
  signal,
  receiveTimeoutSec = RECEIVE_TIMEOUT_SEC,
}: PollingOptions): Promise<void> {
  let status: ConnectionStatus | null = null;
  const setStatus = (next: ConnectionStatus) => {
    if (next === status) return;
    status = next;
    onStatusChange?.(next);
  };

  let failedAttempts = 0;
  setStatus('connecting');

  while (!signal.aborted) {
    try {
      const notification = await client.receiveNotification(receiveTimeoutSec, signal);
      failedAttempts = 0;
      setStatus('online');
      if (!notification) continue;

      try {
        onNotification(notification.body);
      } catch (error) {
        // Битое уведомление не должно блокировать очередь — логируем и удаляем.
        console.error('Не удалось обработать уведомление', error);
      }
      await client.deleteNotification(notification.receiptId, signal);
    } catch (error) {
      if (signal.aborted) break;
      if (error instanceof GreenApiError && error.isUnauthorized) {
        setStatus('unauthorized');
        return;
      }
      failedAttempts += 1;
      setStatus('reconnecting');
      await sleep(getBackoffDelay(failedAttempts), signal);
    }
  }
}
