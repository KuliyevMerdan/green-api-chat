import { vi } from 'vitest';
import type { GreenApiClient } from '../api/greenApiClient';

/** Клиент GREEN-API, у которого все методы — моки. Ответы задаются в тестах. */
export function createFakeClient(overrides: Partial<GreenApiClient> = {}) {
  const mocks = {
    getStateInstance: vi.fn<GreenApiClient['getStateInstance']>(async () => ({
      stateInstance: 'authorized',
    })),
    getSettings: vi.fn<GreenApiClient['getSettings']>(async () => ({
      webhookUrl: '',
      incomingWebhook: 'yes',
    })),
    setSettings: vi.fn<GreenApiClient['setSettings']>(async () => ({ saveSettings: true })),
    checkAccount: vi.fn<GreenApiClient['checkAccount']>(async () => ({
      exist: true,
      chatId: '10000000',
    })),
    sendMessage: vi.fn<GreenApiClient['sendMessage']>(async () => ({ idMessage: 'server-id' })),
    receiveNotification: vi.fn<GreenApiClient['receiveNotification']>(async () => null),
    deleteNotification: vi.fn<GreenApiClient['deleteNotification']>(async () => ({
      result: true,
    })),
  } satisfies GreenApiClient;
  return Object.assign(mocks, overrides);
}
