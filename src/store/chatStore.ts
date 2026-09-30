import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Chat, ChatInfo, Message, MessagePreview, MessageStatus } from '../domain/chat';

/** Сколько последних сообщений каждого чата храним в localStorage. */
const MAX_STORED_MESSAGES = 200;

const STATUS_RANK: Record<MessageStatus, number> = {
  failed: 0,
  pending: 1,
  sent: 2,
  delivered: 3,
  read: 4,
};

interface ChatState {
  /** Инстанс, которому принадлежит история: при входе под другим инстансом она сбрасывается. */
  ownerId: string | null;
  chats: Record<string, Chat>;
  messages: Record<string, Message[]>;
  activeChatId: string | null;
}

interface ChatActions {
  bindOwner(idInstance: string): void;
  openChat(info: ChatInfo): void;
  closeChat(): void;
  /** Добавляет сообщение из уведомления; повторы с тем же id игнорируются. */
  receiveMessage(message: Message, info: ChatInfo): void;
  addPendingMessage(chatId: string, text: string): string;
  removeMessage(chatId: string, messageId: string): void;
  confirmMessage(chatId: string, localId: string, idMessage: string): void;
  failMessage(chatId: string, localId: string): void;
  updateMessageStatus(messageId: string, status: MessageStatus): void;
}

export type ChatStore = ChatState & ChatActions;

const initialState: ChatState = {
  ownerId: null,
  chats: {},
  messages: {},
  activeChatId: null,
};

function createLocalId(): string {
  return `local-${crypto.randomUUID()}`;
}

/** Вставляет сообщение с сохранением сортировки по времени (обычно — в конец). */
function insertSorted(list: readonly Message[], message: Message): Message[] {
  let index = list.length;
  while (index > 0 && list[index - 1]!.timestamp > message.timestamp) index -= 1;
  return [...list.slice(0, index), message, ...list.slice(index)];
}

function toLastMessage({ text, timestamp, direction, unsupported }: Message): MessagePreview {
  return { text: unsupported ? 'Вложение' : text, timestamp, direction };
}

function mergeChat(existing: Chat | undefined, info: ChatInfo): Chat {
  const chat: Chat = existing
    ? { ...existing }
    : { id: info.id, unreadCount: 0, createdAt: Date.now() };
  if (info.name) chat.name = info.name;
  if (info.phone) chat.phone = info.phone;
  if (info.username) chat.username = info.username;
  return chat;
}

function patchMessage(
  state: ChatState,
  chatId: string,
  messageId: string,
  patch: (message: Message) => Message,
): Partial<ChatState> {
  const list = state.messages[chatId];
  const index = list?.findIndex((m) => m.id === messageId) ?? -1;
  if (!list || index === -1) return {};
  const next = list.slice();
  next[index] = patch(list[index]!);
  return { messages: { ...state.messages, [chatId]: next } };
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      bindOwner(idInstance) {
        if (get().ownerId !== idInstance) set({ ...initialState, ownerId: idInstance });
      },

      openChat(info) {
        set((state) => ({
          chats: {
            ...state.chats,
            [info.id]: { ...mergeChat(state.chats[info.id], info), unreadCount: 0 },
          },
          activeChatId: info.id,
        }));
      },

      closeChat() {
        set({ activeChatId: null });
      },

      receiveMessage(message, info) {
        set((state) => {
          const list = state.messages[message.chatId] ?? [];
          if (list.some((m) => m.id === message.id)) return {};

          const chat = mergeChat(state.chats[message.chatId], info);
          const isLatest = !chat.lastMessage || chat.lastMessage.timestamp <= message.timestamp;
          if (isLatest) chat.lastMessage = toLastMessage(message);
          if (message.direction === 'incoming' && state.activeChatId !== message.chatId) {
            chat.unreadCount += 1;
          }

          return {
            chats: { ...state.chats, [chat.id]: chat },
            messages: { ...state.messages, [message.chatId]: insertSorted(list, message) },
          };
        });
      },

      addPendingMessage(chatId, text) {
        const message: Message = {
          id: createLocalId(),
          chatId,
          text,
          timestamp: Date.now(),
          direction: 'outgoing',
          status: 'pending',
        };
        set((state) => {
          const chat = mergeChat(state.chats[chatId], { id: chatId });
          chat.lastMessage = toLastMessage(message);
          return {
            chats: { ...state.chats, [chatId]: chat },
            messages: { ...state.messages, [chatId]: [...(state.messages[chatId] ?? []), message] },
          };
        });
        return message.id;
      },

      removeMessage(chatId, messageId) {
        set((state) => {
          const list = state.messages[chatId];
          if (!list) return {};
          return {
            messages: { ...state.messages, [chatId]: list.filter((m) => m.id !== messageId) },
          };
        });
      },

      confirmMessage(chatId, localId, idMessage) {
        set((state) => {
          const list = state.messages[chatId] ?? [];
          // Уведомление outgoingAPIMessageReceived могло прийти раньше ответа sendMessage.
          if (list.some((m) => m.id === idMessage)) {
            return {
              messages: { ...state.messages, [chatId]: list.filter((m) => m.id !== localId) },
            };
          }
          return patchMessage(state, chatId, localId, (m) => ({
            ...m,
            id: idMessage,
            status: 'sent',
          }));
        });
      },

      failMessage(chatId, localId) {
        set((state) => patchMessage(state, chatId, localId, (m) => ({ ...m, status: 'failed' })));
      },

      updateMessageStatus(messageId, status) {
        set((state) => {
          for (const [chatId, list] of Object.entries(state.messages)) {
            const message = list.find((m) => m.id === messageId);
            if (!message) continue;
            // Статусы могут прийти не по порядку — не понижаем «прочитано» до «доставлено».
            if (message.status && STATUS_RANK[message.status] >= STATUS_RANK[status]) return {};
            return patchMessage(state, chatId, messageId, (m) => ({ ...m, status }));
          }
          return {};
        });
      },
    }),
    {
      name: 'green-max-chats',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ ownerId, chats, messages }) => ({
        ownerId,
        chats,
        messages: Object.fromEntries(
          Object.entries(messages).map(([id, list]) => [id, list.slice(-MAX_STORED_MESSAGES)]),
        ),
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<ChatState>;
        // Отправка, прерванная перезагрузкой страницы, считается неудачной — её можно повторить.
        const messages = Object.fromEntries(
          Object.entries(saved.messages ?? {}).map(([id, list]) => [
            id,
            list.map((m) => (m.status === 'pending' ? { ...m, status: 'failed' as const } : m)),
          ]),
        );
        return { ...current, ...saved, messages };
      },
    },
  ),
);

/** Стабильная ссылка на пустой список, чтобы селекторы не вызывали лишних рендеров. */
export const EMPTY_MESSAGES: readonly Message[] = Object.freeze([]);
