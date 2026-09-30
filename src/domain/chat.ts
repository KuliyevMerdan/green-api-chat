export type MessageDirection = 'incoming' | 'outgoing';

/** `pending` и `failed` — локальные статусы, остальные приходят из MAX. */
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  /** idMessage из GREEN-API либо временный локальный id до подтверждения отправки. */
  id: string;
  chatId: string;
  text: string;
  /** Unix-время в миллисекундах. */
  timestamp: number;
  direction: MessageDirection;
  status?: MessageStatus;
  /** Сообщение нетекстового типа — показываем заглушку. */
  unsupported?: boolean;
}

export type MessagePreview = Pick<Message, 'text' | 'timestamp' | 'direction'>;

export interface Chat {
  id: string;
  name?: string;
  /** Номер телефона, только цифры. */
  phone?: string;
  /** Telegram: `@username`. */
  username?: string;
  lastMessage?: MessagePreview;
  unreadCount: number;
  createdAt: number;
}

export type ChatInfo = Pick<Chat, 'id'> & Partial<Pick<Chat, 'name' | 'phone' | 'username'>>;
