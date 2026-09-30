import { Fragment, useCallback, useLayoutEffect, useRef } from 'react';
import type { Message } from '../../domain/chat';
import { useSendMessage } from '../../hooks/useSendMessage';
import { formatDayLabel, getDayKey } from '../../lib/format';
import { EMPTY_MESSAGES, useChatStore } from '../../store/chatStore';
import { MessageBubble } from './MessageBubble';
import styles from './MessageList.module.css';

/** Насколько близко к низу (px) нужно быть, чтобы лента автоматически прокручивалась. */
const STICK_TO_BOTTOM_THRESHOLD = 120;

export function MessageList({ chatId }: { chatId: string }) {
  const messages = useChatStore((s) => s.messages[chatId] ?? EMPTY_MESSAGES);
  const { retry } = useSendMessage();
  const containerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < STICK_TO_BOTTOM_THRESHOLD;
  }, []);

  // Прокручиваем вниз при новых сообщениях, если пользователь не листает историю
  // или сам только что отправил сообщение.
  useLayoutEffect(() => {
    const el = containerRef.current;
    const last = messages.at(-1);
    if (!el || !last) return;
    if (isNearBottomRef.current || last.status === 'pending') {
      el.scrollTop = el.scrollHeight;
      isNearBottomRef.current = true;
    }
  }, [messages]);

  const handleRetry = useCallback(
    (message: Message) => void retry(message.chatId, message.id, message.text),
    [retry],
  );

  if (messages.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Сообщений пока нет — напишите первым</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={styles.list}
      onScroll={handleScroll}
      role="log"
      aria-live="polite"
      aria-label="Сообщения"
    >
      <div className={styles.inner}>
        {messages.map((message, index) => {
          const dayKey = getDayKey(message.timestamp);
          const prev = messages[index - 1];
          const isNewDay = !prev || getDayKey(prev.timestamp) !== dayKey;
          const isGroupStart = isNewDay || prev.direction !== message.direction;
          return (
            <Fragment key={message.id}>
              {isNewDay && (
                <div className={styles.day} role="separator">
                  <span>{formatDayLabel(message.timestamp)}</span>
                </div>
              )}
              <MessageBubble message={message} isGroupStart={isGroupStart} onRetry={handleRetry} />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
