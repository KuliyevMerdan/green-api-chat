import { useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { MAX_MESSAGE_LENGTH, useSendMessage } from '../../hooks/useSendMessage';
import { IconButton } from '../ui/Button';
import { SendIcon } from '../ui/icons';
import styles from './MessageComposer.module.css';

const MAX_TEXTAREA_HEIGHT = 160;
/** С какой длины показывать счётчик символов. */
const COUNTER_THRESHOLD = MAX_MESSAGE_LENGTH - 500;

/** Подгоняет высоту поля под содержимое, но не выше MAX_TEXTAREA_HEIGHT. */
function fitHeight(el: HTMLTextAreaElement) {
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
}

export function MessageComposer({ chatId }: { chatId: string }) {
  const { send } = useSendMessage();
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const trimmed = text.trim();

  function submit() {
    if (!trimmed) return;
    void send(chatId, trimmed);
    setText('');
    const el = textareaRef.current;
    if (el) {
      el.style.height = '';
      el.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setText(event.target.value);
    fitHeight(event.target);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter — отправить, Shift+Enter — перенос строки. Во время IME-ввода Enter не трогаем.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor={`composer-${chatId}`} className="visually-hidden">
          Сообщение
        </label>
        <textarea
          id={`composer-${chatId}`}
          ref={textareaRef}
          className={styles.textarea}
          rows={1}
          placeholder="Сообщение"
          value={text}
          maxLength={MAX_MESSAGE_LENGTH}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        {text.length > COUNTER_THRESHOLD && (
          <span className={styles.counter} aria-live="polite">
            {MAX_MESSAGE_LENGTH - text.length}
          </span>
        )}
      </div>
      <IconButton type="submit" label="Отправить" className={styles.send} disabled={!trimmed}>
        <SendIcon size={22} />
      </IconButton>
    </form>
  );
}
