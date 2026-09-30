/** Параметры доступа к инстансу из личного кабинета GREEN-API. */
export interface Credentials {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}

export type InstanceState =
  'authorized' | 'notAuthorized' | 'blocked' | 'starting' | 'suspended' | 'pendingPassword';

export interface StateInstanceResponse {
  stateInstance: InstanceState;
}

export type YesNo = 'yes' | 'no';

export interface SettingsResponse {
  wid?: string;
  /** `v3` — MAX, `telegram` — Telegram. */
  typeInstance?: string;
  webhookUrl: string;
  incomingWebhook: YesNo;
  outgoingWebhook?: YesNo;
  outgoingMessageWebhook?: YesNo;
  outgoingAPIMessageWebhook?: YesNo;
}

/** Поиск по `username` поддерживает только Telegram. */
export type CheckAccountRequest = { phoneNumber: number } | { username: string };

/** Уведомления, без которых чат не работает: входящие сообщения и статусы исходящих. */
export type NotificationSettings = Pick<
  Required<SettingsResponse>,
  'incomingWebhook' | 'outgoingWebhook' | 'outgoingMessageWebhook' | 'outgoingAPIMessageWebhook'
>;

export interface SetSettingsResponse {
  saveSettings: boolean;
}

export interface CheckAccountResponse {
  exist: boolean;
  chatId: string;
  /** Telegram: публичное имя пользователя вида `@username`. */
  username?: string;
  phoneNumber?: number;
}

export interface SendMessageRequest {
  chatId: string;
  message: string;
}

export interface SendMessageResponse {
  idMessage: string;
}

export interface ReceivedNotification {
  receiptId: number;
  /** Тело уведомления. Формат не гарантирован — разбирается в `parseNotification`. */
  body: unknown;
}

export interface DeleteNotificationResponse {
  result: boolean;
  reason?: string;
}
