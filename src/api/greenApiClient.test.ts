import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGreenApiClient, GreenApiError } from './greenApiClient';

const credentials = {
  apiUrl: 'https://api.green-api.com/',
  idInstance: '3100000001',
  apiTokenInstance: 'secret-token',
};

const fetchMock = vi.fn<typeof fetch>();

function respond(body: string, status = 200) {
  fetchMock.mockResolvedValueOnce(new Response(body, { status }));
}

function lastRequest() {
  const [url, init] = fetchMock.mock.lastCall ?? [];
  return { url: String(url), init };
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

describe('createGreenApiClient', () => {
  const client = createGreenApiClient(credentials);

  it('отправляет сообщение POST-запросом на правильный URL', async () => {
    respond('{"idMessage":"123"}');

    await expect(client.sendMessage({ chatId: '10000000', message: 'Привет' })).resolves.toEqual({
      idMessage: '123',
    });

    const { url, init } = lastRequest();
    expect(url).toBe('https://api.green-api.com/waInstance3100000001/sendMessage/secret-token');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('{"chatId":"10000000","message":"Привет"}');
  });

  it('передаёт receiveTimeout и возвращает null при пустом ответе', async () => {
    respond('null');

    await expect(client.receiveNotification(20)).resolves.toBeNull();
    expect(lastRequest().url).toContain('/receiveNotification/secret-token?receiveTimeout=20');
  });

  it('считает 408 от receiveNotification пустым ответом', async () => {
    respond('', 408);

    await expect(client.receiveNotification(5)).resolves.toBeNull();
  });

  it('удаляет уведомление DELETE-запросом с receiptId в пути', async () => {
    respond('{"result":true}');

    await client.deleteNotification(42);

    const { url, init } = lastRequest();
    expect(url).toBe(
      'https://api.green-api.com/waInstance3100000001/deleteNotification/secret-token/42',
    );
    expect(init?.method).toBe('DELETE');
  });

  it('превращает 401 в понятную ошибку авторизации', async () => {
    respond('', 401);

    const error = await client.getStateInstance().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GreenApiError);
    expect(error).toMatchObject({ status: 401, isUnauthorized: true });
  });

  it('превращает ответ {status:false, reason} в ошибку с причиной', async () => {
    respond('{"status":false,"reason":"instance is starting or not authorized"}');

    await expect(client.checkAccount({ phoneNumber: 79991234567 })).rejects.toThrow(
      'instance is starting or not authorized',
    );
  });

  it('сообщает о сетевой ошибке', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(client.getSettings()).rejects.toMatchObject({
      name: 'GreenApiError',
      status: 0,
    });
  });

  it('пробрасывает отмену запроса как AbortError', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementationOnce(() => {
      controller.abort();
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    });

    await expect(client.getStateInstance(controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
