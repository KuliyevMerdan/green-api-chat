import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InstanceType } from '../../domain/instance';
import { useChatStore } from '../../store/chatStore';
import { useSessionStore } from '../../store/sessionStore';
import { createFakeClient } from '../../test/fakeClient';
import { renderWithClient } from '../../test/render';
import { NewChatForm } from './NewChatForm';

function setup(instanceType: InstanceType, client = createFakeClient()) {
  useSessionStore.getState().login({
    credentials: { apiUrl: 'https://api.green-api.com', idInstance: '1', apiTokenInstance: 't' },
    instanceType,
  });
  const onDone = vi.fn<() => void>();
  renderWithClient(<NewChatForm onDone={onDone} />, client);
  return { client, onDone, input: screen.getByRole('textbox') };
}

async function submit(input: HTMLElement, value: string) {
  await userEvent.type(input, value);
  await userEvent.click(screen.getByRole('button', { name: 'Создать чат' }));
}

describe('NewChatForm', () => {
  beforeEach(() => {
    useChatStore.getState().bindOwner(crypto.randomUUID());
  });

  it('MAX: проверяет номер и открывает чат с chatId из checkAccount', async () => {
    const { client, onDone, input } = setup('max');

    await submit(input, '8 (999) 123-45-67');

    expect(client.checkAccount).toHaveBeenCalledWith(
      { phoneNumber: 79991234567 },
      expect.any(AbortSignal),
    );
    expect(onDone).toHaveBeenCalled();
    const { activeChatId, chats } = useChatStore.getState();
    expect(activeChatId).toBe('10000000');
    expect(chats['10000000']).toMatchObject({ phone: '79991234567' });
  });

  it('MAX: отклоняет иностранный номер без запроса к API', async () => {
    const { client, input } = setup('max');

    await submit(input, '+49 151 1234 5678');

    expect(
      screen.getByText('MAX поддерживает только номера России (+7) и Беларуси (+375)'),
    ).toBeVisible();
    expect(client.checkAccount).not.toHaveBeenCalled();
  });

  it('Telegram: принимает номер любой страны', async () => {
    const { client, onDone, input } = setup('telegram');

    await submit(input, '+49 151 1234 5678');

    expect(client.checkAccount).toHaveBeenCalledWith(
      { phoneNumber: 4915112345678 },
      expect.any(AbortSignal),
    );
    expect(onDone).toHaveBeenCalled();
  });

  it('Telegram: ищет получателя по username', async () => {
    const client = createFakeClient({
      checkAccount: async () => ({ exist: true, chatId: '555', username: '@john_doe' }),
    });
    const { onDone, input } = setup('telegram', client);

    await submit(input, '@john_doe');

    expect(onDone).toHaveBeenCalled();
    expect(useChatStore.getState().chats['555']).toMatchObject({ username: '@john_doe' });
  });

  it('сообщает, если аккаунт не найден', async () => {
    const client = createFakeClient({ checkAccount: async () => ({ exist: false, chatId: '' }) });
    const { onDone, input } = setup('telegram', client);

    await submit(input, '+79991234567');

    expect(await screen.findByText('Аккаунт в Telegram не найден')).toBeVisible();
    expect(onDone).not.toHaveBeenCalled();
  });
});
