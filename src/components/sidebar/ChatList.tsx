import { memo, useMemo } from 'react';
import type { Chat } from '../../domain/chat';
import { formatChatListTime, getChatTitle } from '../../lib/format';
import { useChatStore } from '../../store/chatStore';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { ChatBubbleIcon } from '../ui/icons';
import styles from './ChatList.module.css';

const byRecentActivity = (a: Chat, b: Chat) =>
  (b.lastMessage?.timestamp ?? b.createdAt) - (a.lastMessage?.timestamp ?? a.createdAt);

export function ChatList({ onCreateChat }: { onCreateChat: () => void }) {
  const chats = useChatStore((s) => s.chats);
  const activeChatId = useChatStore((s) => s.activeChatId);
  const openChat = useChatStore((s) => s.openChat);
  const sortedChats = useMemo(() => Object.values(chats).toSorted(byRecentActivity), [chats]);

  if (sortedChats.length === 0) {
    return (
      <div className={styles.empty}>
        <ChatBubbleIcon size={40} />
        <p>Здесь появятся ваши чаты</p>
        <Button variant="secondary" onClick={onCreateChat}>
          Начать новый чат
        </Button>
      </div>
    );
  }

  return (
    <nav className={styles.list} aria-label="Список чатов">
      <ul>
        {sortedChats.map((chat) => (
          <ChatListItem
            key={chat.id}
            chat={chat}
            isActive={chat.id === activeChatId}
            onSelect={openChat}
          />
        ))}
      </ul>
    </nav>
  );
}

interface ChatListItemProps {
  chat: Chat;
  isActive: boolean;
  onSelect: (chat: Pick<Chat, 'id'>) => void;
}

const ChatListItem = memo(function ChatListItem({ chat, isActive, onSelect }: ChatListItemProps) {
  const title = getChatTitle(chat);
  const { lastMessage, unreadCount } = chat;

  return (
    <li>
      <button
        type="button"
        className={styles.item}
        aria-current={isActive || undefined}
        onClick={() => onSelect({ id: chat.id })}
      >
        <Avatar seed={chat.id} name={chat.name ?? chat.username} />
        <span className={styles.body}>
          <span className={styles.row}>
            <span className={styles.title}>{title}</span>
            {lastMessage && (
              <time
                className={styles.time}
                dateTime={new Date(lastMessage.timestamp).toISOString()}
              >
                {formatChatListTime(lastMessage.timestamp)}
              </time>
            )}
          </span>
          <span className={styles.row}>
            <span className={styles.preview}>
              {lastMessage ? (
                <>
                  {lastMessage.direction === 'outgoing' && <span className={styles.you}>Вы: </span>}
                  {lastMessage.text}
                </>
              ) : (
                'Нет сообщений'
              )}
            </span>
            {unreadCount > 0 && (
              <span className={styles.badge} aria-label={`Непрочитанных: ${unreadCount}`}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
});
