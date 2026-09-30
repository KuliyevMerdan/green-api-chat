import { useState } from 'react';
import type { ConnectionStatus } from '../../api/polling';
import { INSTANCE_LABELS, type InstanceType } from '../../domain/instance';
import { useSessionStore } from '../../store/sessionStore';
import { IconButton } from '../ui/Button';
import { CloseIcon, LogoutIcon, PlusIcon } from '../ui/icons';
import { ChatList } from './ChatList';
import { NewChatForm } from './NewChatForm';
import styles from './Sidebar.module.css';

const CONNECTION_LABELS: Record<ConnectionStatus, string> = {
  connecting: 'Подключение…',
  online: 'В сети',
  reconnecting: 'Переподключение…',
  unauthorized: 'Нет доступа',
};

interface SidebarProps {
  connection: ConnectionStatus;
  idInstance: string;
  instanceType: InstanceType;
  className?: string | undefined;
}

export function Sidebar({ connection, idInstance, instanceType, className }: SidebarProps) {
  const logout = useSessionStore((s) => s.logout);
  const [isCreating, setIsCreating] = useState(false);

  return (
    <aside className={[styles.sidebar, className].filter(Boolean).join(' ')}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h1 className={styles.title}>Чаты</h1>
          <p className={styles.connection} data-status={connection} aria-live="polite">
            <span className={styles.dot} aria-hidden="true" />
            {CONNECTION_LABELS[connection]} · {INSTANCE_LABELS[instanceType]} · {idInstance}
          </p>
        </div>
        <IconButton
          label={isCreating ? 'Отменить' : 'Новый чат'}
          onClick={() => setIsCreating((v) => !v)}
          aria-expanded={isCreating}
        >
          {isCreating ? <CloseIcon size={22} /> : <PlusIcon size={22} />}
        </IconButton>
        <IconButton label="Выйти" onClick={logout}>
          <LogoutIcon size={20} />
        </IconButton>
      </header>

      {isCreating && <NewChatForm onDone={() => setIsCreating(false)} />}

      <ChatList onCreateChat={() => setIsCreating(true)} />
    </aside>
  );
}
