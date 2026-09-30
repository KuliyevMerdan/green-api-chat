import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionStore } from '../../store/sessionStore';
import { LoginScreen } from './LoginScreen';

const fetchMock = vi.fn<typeof fetch>();

/** Отвечает на запросы по имени метода GREEN-API в URL. */
function mockApi(responses: Record<string, () => Response>) {
  fetchMock.mockImplementation(async (input) => {
    const method = Object.keys(responses).find((name) => String(input).includes(`/${name}/`));
    return method ? responses[method]!() : new Response('', { status: 404 });
  });
}

const json = (body: unknown) => () => new Response(JSON.stringify(body));

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText('apiUrl'), 'https://7103.api.greenapi.com/');
  await userEvent.type(screen.getByLabelText('idInstance'), '3100000001');
  await userEvent.type(screen.getByLabelText('apiTokenInstance'), 'abcdef1234567890');
  await userEvent.click(screen.getByRole('button', { name: 'Войти' }));
}

describe('LoginScreen', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    useSessionStore.getState().logout();
  });

  it.each([
    ['v3', 'max'],
    ['telegram', 'telegram'],
  ] as const)('входит и определяет тип инстанса %s', async (typeInstance, instanceType) => {
    mockApi({
      getStateInstance: json({ stateInstance: 'authorized' }),
      getSettings: json({ typeInstance, webhookUrl: '', incomingWebhook: 'yes' }),
    });
    render(<LoginScreen />);

    await fillAndSubmit();

    expect(fetchMock).toHaveBeenCalledWith(
      new URL(
        'https://7103.api.greenapi.com/waInstance3100000001/getStateInstance/abcdef1234567890',
      ),
      expect.anything(),
    );
    expect(useSessionStore.getState().session).toEqual({
      credentials: {
        apiUrl: 'https://7103.api.greenapi.com',
        idInstance: '3100000001',
        apiTokenInstance: 'abcdef1234567890',
      },
      instanceType,
    });
  });

  it('показывает ошибку при неверных данных', async () => {
    mockApi({
      getStateInstance: () => new Response('', { status: 401 }),
      getSettings: () => new Response('', { status: 401 }),
    });
    render(<LoginScreen />);

    await fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Неверный idInstance или apiTokenInstance',
    );
    expect(useSessionStore.getState().session).toBeNull();
  });

  it('не пускает, если инстанс не авторизован', async () => {
    mockApi({
      getStateInstance: json({ stateInstance: 'notAuthorized' }),
      getSettings: json({ typeInstance: 'telegram', webhookUrl: '', incomingWebhook: 'yes' }),
    });
    render(<LoginScreen />);

    await fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Инстанс не авторизован');
  });

  it('сообщает о неподдерживаемом типе инстанса', async () => {
    mockApi({
      getStateInstance: json({ stateInstance: 'authorized' }),
      getSettings: json({ typeInstance: 'whatsapp', webhookUrl: '', incomingWebhook: 'yes' }),
    });
    render(<LoginScreen />);

    await fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Поддерживаются инстансы MAX и Telegram',
    );
    expect(useSessionStore.getState().session).toBeNull();
  });

  it('при сетевой ошибке подсказывает проверить apiUrl', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<LoginScreen />);

    await fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Не удалось подключиться к 7103.api.greenapi.com. Проверьте apiUrl',
    );
  });

  it('валидирует поля до запроса', async () => {
    render(<LoginScreen />);

    await userEvent.type(screen.getByLabelText('idInstance'), 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }));

    expect(screen.getByText('idInstance состоит только из цифр')).toBeVisible();
    expect(screen.getByText('Укажите apiUrl из личного кабинета')).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
