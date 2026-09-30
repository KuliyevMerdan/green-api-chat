import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GreenApiClient } from './greenApiClient';
import { GreenApiError } from './greenApiClient';
import { getBackoffDelay, runNotificationPolling, type ConnectionStatus } from './polling';

type Receive = GreenApiClient['receiveNotification'];
type NotificationResult = Awaited<ReturnType<Receive>>;

/** Отдаёт ответы по очереди, а когда они заканчиваются — останавливает цикл. */
function createClient(
  controller: AbortController,
  responses: Array<() => NotificationResult | Promise<NotificationResult>>,
) {
  const queue = [...responses];
  return {
    receiveNotification: vi.fn<Receive>(async () => {
      const next = queue.shift();
      if (!next) {
        controller.abort();
        return null;
      }
      return next();
    }),
    deleteNotification: vi.fn<GreenApiClient['deleteNotification']>(async () => ({
      result: true,
    })),
  };
}

const noJitter = () => 0.5;
const noop = () => {};

describe('runNotificationPolling', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(noop);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('обрабатывает уведомление и удаляет его из очереди', async () => {
    const controller = new AbortController();
    const client = createClient(controller, [() => ({ receiptId: 1, body: { a: 1 } }), () => null]);
    const onNotification = vi.fn<(body: unknown) => void>();
    const statuses: ConnectionStatus[] = [];

    await runNotificationPolling({
      client,
      onNotification,
      onStatusChange: (s) => statuses.push(s),
      signal: controller.signal,
    });

    expect(onNotification).toHaveBeenCalledExactlyOnceWith({ a: 1 });
    expect(client.deleteNotification).toHaveBeenCalledWith(1, controller.signal);
    expect(statuses).toEqual(['connecting', 'online']);
  });

  it('удаляет уведомление, даже если обработчик упал', async () => {
    const controller = new AbortController();
    const client = createClient(controller, [() => ({ receiptId: 7, body: null })]);

    await runNotificationPolling({
      client,
      onNotification: () => {
        throw new Error('boom');
      },
      signal: controller.signal,
    });

    expect(client.deleteNotification).toHaveBeenCalledWith(7, controller.signal);
  });

  it('после сетевой ошибки ждёт и переподключается', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const client = createClient(controller, [
      () => Promise.reject(new GreenApiError('offline', 0)),
      () => null,
    ]);
    const statuses: ConnectionStatus[] = [];

    const done = runNotificationPolling({
      client,
      onNotification: noop,
      onStatusChange: (s) => statuses.push(s),
      signal: controller.signal,
    });
    await vi.runAllTimersAsync();
    await done;

    expect(client.receiveNotification).toHaveBeenCalledTimes(3);
    expect(statuses).toEqual(['connecting', 'reconnecting', 'online']);
  });

  it('останавливается при ошибке авторизации', async () => {
    const controller = new AbortController();
    const client = createClient(controller, [() => Promise.reject(new GreenApiError('no', 401))]);
    const onStatusChange = vi.fn<(status: ConnectionStatus) => void>();

    await runNotificationPolling({
      client,
      onNotification: noop,
      onStatusChange,
      signal: controller.signal,
    });

    expect(client.receiveNotification).toHaveBeenCalledOnce();
    expect(onStatusChange).toHaveBeenLastCalledWith('unauthorized');
  });
});

describe('getBackoffDelay', () => {
  it('растёт экспоненциально и ограничен 30 секундами', () => {
    expect(getBackoffDelay(1, noJitter)).toBe(1000);
    expect(getBackoffDelay(2, noJitter)).toBe(2000);
    expect(getBackoffDelay(4, noJitter)).toBe(8000);
    expect(getBackoffDelay(20, noJitter)).toBe(30_000);
  });
});
