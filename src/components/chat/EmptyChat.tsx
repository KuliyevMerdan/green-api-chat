import { ChatBubbleIcon } from '../ui/icons';
import styles from './EmptyChat.module.css';

export function EmptyChat() {
  return (
    <div className={styles.empty}>
      <span className={styles.icon}>
        <ChatBubbleIcon size={32} />
      </span>
      <p>Выберите чат или создайте новый по номеру телефона</p>
    </div>
  );
}
