import { memo } from 'react';
import type { Message, MessageStatus } from '../../domain/chat';
import { formatTime } from '../../lib/format';
import { AlertIcon, CheckIcon, ClockIcon, DoubleCheckIcon } from '../ui/icons';
import styles from './MessageBubble.module.css';

const STATUS_LABELS: Record<MessageStatus, string> = {
  pending: 'Отправляется',
  sent: 'Отправлено',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Не отправлено',
};

function StatusIcon({ status }: { status: MessageStatus }) {
  switch (status) {
    case 'pending':
      return <ClockIcon size={14} />;
    case 'sent':
      return <CheckIcon size={15} />;
    case 'delivered':
    case 'read':
      return <DoubleCheckIcon size={16} />;
    case 'failed':
      return <AlertIcon size={15} />;
  }
}

interface MessageBubbleProps {
  message: Message;
  isGroupStart: boolean;
  onRetry: (message: Message) => void;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isGroupStart,
  onRetry,
}: MessageBubbleProps) {
  const { text, timestamp, direction, status, unsupported } = message;

  return (
    <div
      className={styles.row}
      data-direction={direction}
      data-group-start={isGroupStart || undefined}
    >
      <div className={styles.bubble} data-status={status}>
        {unsupported ? (
          <span className={styles.unsupported}>Этот тип сообщения пока не поддерживается</span>
        ) : (
          <span className={styles.text}>{text}</span>
        )}
        <span className={styles.meta}>
          <time dateTime={new Date(timestamp).toISOString()}>{formatTime(timestamp)}</time>
          {status && (
            <span className={styles.status} data-status={status} title={STATUS_LABELS[status]}>
              <StatusIcon status={status} />
              <span className="visually-hidden">{STATUS_LABELS[status]}</span>
            </span>
          )}
        </span>
      </div>
      {status === 'failed' && (
        <button type="button" className={styles.retry} onClick={() => onRetry(message)}>
          Повторить
        </button>
      )}
    </div>
  );
});
