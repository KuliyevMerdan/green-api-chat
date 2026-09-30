import { useEffect } from 'react';
import type { InstanceType } from '../domain/instance';
import { useNotificationPolling } from '../hooks/useNotificationPolling';
import { useChatStore } from '../store/chatStore';
import { ChatView } from './chat/ChatView';
import { EmptyChat } from './chat/EmptyChat';
import { InstanceBanner } from './InstanceBanner';
import { Sidebar } from './sidebar/Sidebar';
import styles from './Messenger.module.css';

interface MessengerProps {
  idInstance: string;
  instanceType: InstanceType;
}

export function Messenger({ idInstance, instanceType }: MessengerProps) {
  const connection = useNotificationPolling();
  const activeChatId = useChatStore((s) => s.activeChatId);
  const bindOwner = useChatStore((s) => s.bindOwner);

  useEffect(() => {
    bindOwner(idInstance);
  }, [bindOwner, idInstance]);

  return (
    <div className={styles.shell}>
      <InstanceBanner connection={connection} />
      <div className={styles.layout} data-chat-open={activeChatId !== null || undefined}>
        <Sidebar
          className={styles.sidebar}
          connection={connection}
          idInstance={idInstance}
          instanceType={instanceType}
        />
        <main className={styles.main}>
          {activeChatId ? <ChatView key={activeChatId} chatId={activeChatId} /> : <EmptyChat />}
        </main>
      </div>
    </div>
  );
}
