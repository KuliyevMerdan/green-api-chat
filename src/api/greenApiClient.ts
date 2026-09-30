import type {
  CheckAccountRequest,
  CheckAccountResponse,
  Credentials,
  DeleteNotificationResponse,
  ReceivedNotification,
  SendMessageRequest,
  SendMessageResponse,
  SetSettingsResponse,
  NotificationSettings,
  SettingsResponse,
  StateInstanceResponse,
} from './types';

/**
 * Время ожидания уведомления на стороне сервера. По документации допустимо 5–60 секунд,
 * но часть хостов (например, Telegram-инстансы) отвечает 408 на всё, что больше 5.
 * Long polling и так отдаёт уведомление сразу, поэтому 5 секунд не замедляют доставку.
 */
export const RECEIVE_TIMEOUT_SEC = 5;

const REQUEST_TIMEOUT_MS = 15_000;

export class GreenApiError extends Error {
  override readonly name = 'GreenApiError';
  /** HTTP-статус ответа; 0 — сетевая ошибка или таймаут. */
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }

  get isUnauthorized(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

export interface GreenApiClient {
  getStateInstance(signal?: AbortSignal): Promise<StateInstanceResponse>;
  getSettings(signal?: AbortSignal): Promise<SettingsResponse>;
  /** Инстанс перезапускается, новые настройки применяются в течение ~5 минут. */
  setSettings(
    settings: Partial<NotificationSettings>,
    signal?: AbortSignal,
  ): Promise<SetSettingsResponse>;
  checkAccount(request: CheckAccountRequest, signal?: AbortSignal): Promise<CheckAccountResponse>;
  sendMessage(request: SendMessageRequest, signal?: AbortSignal): Promise<SendMessageResponse>;
  /** Возвращает `null`, если за `receiveTimeoutSec` уведомлений не пришло. */
  receiveNotification(
    receiveTimeoutSec: number,
    signal?: AbortSignal,
  ): Promise<ReceivedNotification | null>;
  deleteNotification(receiptId: number, signal?: AbortSignal): Promise<DeleteNotificationResponse>;
}

interface RequestOptions {
  httpMethod?: 'GET' | 'POST' | 'DELETE';
  pathSuffix?: string;
  query?: Record<string, string | number>;
  body?: unknown;
  signal?: AbortSignal | undefined;
  timeoutMs?: number;
}

function describeHttpError(status: number): string {
  if (status === 400) return 'Некорректный запрос к GREEN-API';
  if (status === 401 || status === 403) return 'Неверный idInstance или apiTokenInstance';
  if (status === 404) return 'Метод не найден — проверьте API URL';
  if (status === 429) return 'Слишком много запросов, попробуйте позже';
  if (status === 466) return 'Исчерпан лимит запросов по тарифу инстанса';
  if (status === 469) return 'Превышен лимит проверок номеров, повторите через 2 часа';
  if (status >= 500) return 'Сервер GREEN-API временно недоступен';
  return `Ошибка GREEN-API (HTTP ${status})`;
}

function parseJson(text: string): unknown {
  if (text.trim() === '') return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new GreenApiError('Сервер вернул некорректный ответ', 0);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Проверяет, что ответ — объект с нужными полями. Часть методов при неготовом инстансе
 * отвечает `200 { status: false, reason }` — такие ответы превращаются в ошибку.
 */
function expectObject<T>(data: unknown, requiredKeys: readonly (keyof T & string)[]): T {
  if (!isRecord(data)) {
    throw new GreenApiError('Сервер вернул пустой ответ', 0);
  }
  if (requiredKeys.every((key) => key in data)) {
    return data as T;
  }
  const reason = typeof data.reason === 'string' && data.reason ? data.reason : null;
  throw new GreenApiError(reason ?? 'Сервер вернул неожиданный ответ', 0);
}

export function normalizeApiUrl(apiUrl: string): string {
  return apiUrl.trim().replace(/\/+$/, '');
}

export function createGreenApiClient({
  apiUrl,
  idInstance,
  apiTokenInstance,
}: Credentials): GreenApiClient {
  const baseUrl = `${normalizeApiUrl(apiUrl)}/waInstance${encodeURIComponent(idInstance)}`;
  const token = encodeURIComponent(apiTokenInstance);

  async function request(method: string, options: RequestOptions = {}): Promise<unknown> {
    const { httpMethod = 'GET', pathSuffix = '', query, body, signal } = options;
    const url = new URL(`${baseUrl}/${method}/${token}${pathSuffix}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      url.searchParams.set(key, String(value));
    }

    const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? REQUEST_TIMEOUT_MS);
    const init: RequestInit = {
      method: httpMethod,
      signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
    };
    if (body !== undefined) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      // Отмену вызывающей стороной пробрасываем как есть, чтобы её можно было отличить от сбоя.
      if (signal?.aborted) throw error;
      if (timeoutSignal.aborted) throw new GreenApiError('Сервер GREEN-API не отвечает', 0);
      throw new GreenApiError('Нет соединения с сервером GREEN-API', 0);
    }

    if (!response.ok) {
      throw new GreenApiError(describeHttpError(response.status), response.status);
    }
    return parseJson(await response.text());
  }

  return {
    async getStateInstance(signal) {
      const data = await request('getStateInstance', { signal });
      return expectObject<StateInstanceResponse>(data, ['stateInstance']);
    },

    async getSettings(signal) {
      const data = await request('getSettings', { signal });
      return expectObject<SettingsResponse>(data, ['webhookUrl', 'incomingWebhook']);
    },

    async setSettings(settings, signal) {
      const data = await request('setSettings', { httpMethod: 'POST', body: settings, signal });
      return expectObject<SetSettingsResponse>(data, ['saveSettings']);
    },

    async checkAccount(payload, signal) {
      const data = await request('checkAccount', { httpMethod: 'POST', body: payload, signal });
      return expectObject<CheckAccountResponse>(data, ['exist', 'chatId']);
    },

    async sendMessage(payload, signal) {
      const data = await request('sendMessage', { httpMethod: 'POST', body: payload, signal });
      return expectObject<SendMessageResponse>(data, ['idMessage']);
    },

    async receiveNotification(receiveTimeoutSec, signal) {
      let data: unknown;
      try {
        data = await request('receiveNotification', {
          query: { receiveTimeout: receiveTimeoutSec },
          signal,
          // Long polling: клиентский таймаут должен быть больше серверного.
          timeoutMs: (receiveTimeoutSec + 10) * 1000,
        });
      } catch (error) {
        // 408 — сервер не дождался уведомлений: для long polling это пустой ответ, а не сбой.
        if (error instanceof GreenApiError && error.status === 408) return null;
        throw error;
      }
      if (data === null) return null;
      return expectObject<ReceivedNotification>(data, ['receiptId', 'body']);
    },

    async deleteNotification(receiptId, signal) {
      const data = await request('deleteNotification', {
        httpMethod: 'DELETE',
        pathSuffix: `/${receiptId}`,
        signal,
      });
      return expectObject<DeleteNotificationResponse>(data, ['result']);
    },
  };
}
