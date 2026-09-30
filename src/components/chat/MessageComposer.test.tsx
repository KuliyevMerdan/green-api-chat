import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatStore } from '../../store/chatStore';
import { createFakeClient } from '../../test/fakeClient';
import { renderWithClient } from '../../test/render';
import { MessageComposer } from './MessageComposer';

const CHAT_ID = '10000000';

describe('MessageComposer', () => {
  beforeEach(() => {
    useChatStore.getState().bindOwner(crypto.randomUUID());
  });

  it('отправляет сообщение по Enter и очищает поле', async () => {
    const client = createFakeClient();
    renderWithClient(<MessageComposer chatId={CHAT_ID} />, client);
    const input = screen.getByLabelText('Сообщение');

    await userEvent.type(input, '  Привет, MAX!  {Enter}');

    expect(client.sendMessage).toHaveBeenCalledExactlyOnceWith({
      chatId: CHAT_ID,
      message: 'Привет, MAX!',
    });
    expect(input).toHaveValue('');
    await waitFor(() =>
      expect(useChatStore.getState().messages[CHAT_ID]).toEqual([
        expect.objectContaining({ id: 'server-id', text: 'Привет, MAX!', status: 'sent' }),
      ]),
    );
  });

  it('Shift+Enter переносит строку, а пустое сообщение не отправляется', async () => {
    const client = createFakeClient();
    renderWithClient(<MessageComposer chatId={CHAT_ID} />, client);
    const input = screen.getByLabelText('Сообщение');

    await userEvent.type(input, '{Enter}');
    expect(screen.getByRole('button', { name: 'Отправить' })).toBeDisabled();

    await userEvent.type(input, 'строка 1{Shift>}{Enter}{/Shift}строка 2');
    expect(input).toHaveValue('строка 1\nстрока 2');
    expect(client.sendMessage).not.toHaveBeenCalled();
  });

  it('помечает сообщение как неотправленное при ошибке API', async () => {
    const client = createFakeClient({
      sendMessage: async () => Promise.reject(new Error('offline')),
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWithClient(<MessageComposer chatId={CHAT_ID} />, client);

    await userEvent.type(screen.getByLabelText('Сообщение'), 'Тест{Enter}');

    await waitFor(() =>
      expect(useChatStore.getState().messages[CHAT_ID]?.[0]?.status).toBe('failed'),
    );
  });
});
