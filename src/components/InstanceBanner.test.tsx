import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GreenApiError } from '../api/greenApiClient';
import type { SettingsResponse } from '../api/types';
import { createFakeClient } from '../test/fakeClient';
import { renderWithClient } from '../test/render';
import { InstanceBanner } from './InstanceBanner';

const allEnabled: SettingsResponse = {
  webhookUrl: '',
  incomingWebhook: 'yes',
  outgoingWebhook: 'yes',
  outgoingMessageWebhook: 'yes',
  outgoingAPIMessageWebhook: 'yes',
};

describe('InstanceBanner', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ничего не показывает, если всё настроено', async () => {
    const client = createFakeClient();
    client.getSettings.mockResolvedValue(allEnabled);
    const { container } = renderWithClient(<InstanceBanner connection="online" />, client);

    await waitFor(() => expect(client.getSettings).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('предлагает включить выключенные уведомления и сохраняет настройки', async () => {
    const client = createFakeClient({
      getSettings: async () => ({ ...allEnabled, incomingWebhook: 'no', outgoingWebhook: 'no' }),
    });
    renderWithClient(<InstanceBanner connection="online" />, client);

    expect(await screen.findByText(/Уведомления о входящих выключены/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Включить' }));

    expect(client.setSettings).toHaveBeenCalledWith({
      incomingWebhook: 'yes',
      outgoingWebhook: 'yes',
      outgoingMessageWebhook: 'yes',
      outgoingAPIMessageWebhook: 'yes',
    });
    expect(await screen.findByText(/Уведомления включены/)).toBeVisible();
  });

  it('повторяет getSettings, если сервер ответил 429', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let calls = 0;
    const client = createFakeClient({
      getSettings: async () => {
        calls += 1;
        if (calls === 1) throw new GreenApiError('Слишком много запросов', 429);
        return { ...allEnabled, incomingWebhook: 'no' };
      },
    });
    renderWithClient(<InstanceBanner connection="online" />, client);

    await vi.advanceTimersByTimeAsync(1500);

    expect(await screen.findByText(/Уведомления о входящих выключены/)).toBeVisible();
    expect(calls).toBe(2);
  });

  it('предупреждает о заданном webhookUrl без кнопки исправления', async () => {
    const client = createFakeClient({
      getSettings: async () => ({ ...allEnabled, webhookUrl: 'https://example.com/hook' }),
    });
    renderWithClient(<InstanceBanner connection="online" />, client);

    expect(await screen.findByText(/указан webhookUrl/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Включить' })).not.toBeInTheDocument();
  });
});
