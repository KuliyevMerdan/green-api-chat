import { INSTANCE_LABELS } from '../../domain/instance';
import { getChatSubtitle, getChatTitle } from '../../lib/format';
import { useChatStore } from '../../store/chatStore';
import { useInstanceType } from '../../store/sessionStore';
import { Avatar } from '../ui/Avatar';
import { IconButton } from '../ui/Button';
import { BackIcon } from '../ui/icons';
import { MessageComposer } from './MessageComposer';
import { MessageList } from './MessageList';
import styles from './ChatView.module.css';

export function ChatView({ chatId }: { chatId: string }) {
  const chat = useChatStore((s) => s.chats[chatId]);
  const closeChat = useChatStore((s) => s.closeChat);
  const instanceType = useInstanceType();

  if (!chat) return null;
  const title = getChatTitle(chat);
  const subtitle = getChatSubtitle(chat, INSTANCE_LABELS[instanceType]);

  return (
    <section className={styles.chat} aria-label={`Чат: ${title}`}>
      <header className={styles.header}>
        <IconButton label="Назад к чатам" className={styles.back} onClick={closeChat}>
          <BackIcon />
        </IconButton>
        <Avatar seed={chat.id} name={chat.name ?? chat.username} size={40} />
        <div className={styles.info}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
      </header>
      <MessageList chatId={chatId} />
      <MessageComposer chatId={chatId} />
    </section>
  );
}
