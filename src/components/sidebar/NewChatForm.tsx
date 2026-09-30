import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useGreenApi } from '../../api/GreenApiContext';
import { GreenApiError } from '../../api/greenApiClient';
import type { CheckAccountRequest } from '../../api/types';
import type { Chat, ChatInfo } from '../../domain/chat';
import { INSTANCE_LABELS, type InstanceType } from '../../domain/instance';
import { parseRecipient, type Recipient } from '../../lib/recipient';
import { useChatStore } from '../../store/chatStore';
import { useInstanceType } from '../../store/sessionStore';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import styles from './NewChatForm.module.css';

const FIELD_COPY: Record<InstanceType, { label: string; placeholder: string; hint: string }> = {
  max: {
    label: 'Номер телефона получателя',
    placeholder: '+7 999 123-45-67',
    hint: 'Россия (+7) или Беларусь (+375)',
  },
  telegram: {
    label: 'Номер телефона или username получателя',
    placeholder: '+7 999 123-45-67 или @username',
    hint: 'Номер в международном формате, с кодом страны',
  },
};

function matchesRecipient(chat: Chat, recipient: Recipient): boolean {
  return recipient.kind === 'phone'
    ? chat.phone === recipient.phone
    : chat.username?.toLowerCase() === recipient.username.toLowerCase();
}

function toCheckAccountRequest(recipient: Recipient): CheckAccountRequest {
  return recipient.kind === 'phone'
    ? { phoneNumber: Number(recipient.phone) }
    : { username: recipient.username };
}

export function NewChatForm({ onDone }: { onDone: () => void }) {
  const client = useGreenApi();
  const instanceType = useInstanceType();
  const openChat = useChatStore((s) => s.openChat);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const copy = FIELD_COPY[instanceType];

  useEffect(() => () => abortRef.current?.abort(), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseRecipient(value, instanceType);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const { recipient } = parsed;

    // Не тратим лимит checkAccount, если чат с этим получателем уже есть.
    const existing = Object.values(useChatStore.getState().chats).find((chat) =>
      matchesRecipient(chat, recipient),
    );
    if (existing) {
      openChat({ id: existing.id });
      onDone();
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsChecking(true);
    setError(null);
    try {
      const account = await client.checkAccount(
        toCheckAccountRequest(recipient),
        controller.signal,
      );
      if (account.exist && account.chatId) {
        const info: ChatInfo = { id: account.chatId };
        const phone = recipient.kind === 'phone' ? recipient.phone : account.phoneNumber;
        const username = recipient.kind === 'username' ? recipient.username : account.username;
        if (phone) info.phone = String(phone);
        if (username) info.username = username;
        openChat(info);
        onDone();
        return;
      }
      setError(`Аккаунт в ${INSTANCE_LABELS[instanceType]} не найден`);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof GreenApiError ? err.message : 'Не удалось найти получателя');
    }
    setIsChecking(false);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <TextField
        label={copy.label}
        type={instanceType === 'telegram' ? 'text' : 'tel'}
        inputMode={instanceType === 'telegram' ? 'text' : 'tel'}
        autoComplete="off"
        spellCheck={false}
        placeholder={copy.placeholder}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        error={error}
        hint={copy.hint}
        autoFocus
      />
      <Button type="submit" fullWidth loading={isChecking}>
        Создать чат
      </Button>
    </form>
  );
}
