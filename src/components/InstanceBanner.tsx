import { useEffect, useState } from 'react';
import { GreenApiError } from '../api/greenApiClient';
import { useGreenApi } from '../api/GreenApiContext';
import type { ConnectionStatus } from '../api/polling';
import type { NotificationSettings, SettingsResponse } from '../api/types';
import { useSessionStore } from '../store/sessionStore';
import { Button } from './ui/Button';
import { AlertIcon } from './ui/icons';
import styles from './InstanceBanner.module.css';

/** Всё, что нужно чату: входящие сообщения, эхо отправленных и статусы доставки. */
const REQUIRED_NOTIFICATIONS: NotificationSettings = {
  incomingWebhook: 'yes',
  outgoingWebhook: 'yes',
  outgoingMessageWebhook: 'yes',
  outgoingAPIMessageWebhook: 'yes',
};

const SETTINGS_RETRY_DELAYS_MS = [1000, 3000, 7000];

type SettingsProblem =
  | { kind: 'webhook' }
  | { kind: 'notifications'; incomingDisabled: boolean }
  | { kind: 'loadFailed' };

type FixState = 'idle' | 'saving' | 'saved' | { error: string };

function findProblem(settings: SettingsResponse): SettingsProblem | null {
  if (settings.webhookUrl) return { kind: 'webhook' };
  const keys = Object.keys(REQUIRED_NOTIFICATIONS) as (keyof NotificationSettings)[];
  if (keys.every((key) => settings[key] === 'yes')) return null;
  return { kind: 'notifications', incomingDisabled: settings.incomingWebhook !== 'yes' };
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
  });
}

/** Предупреждения, из-за которых чат не сможет получать сообщения, и быстрое исправление. */
export function InstanceBanner({ connection }: { connection: ConnectionStatus }) {
  const client = useGreenApi();
  const logout = useSessionStore((s) => s.logout);
  const [problem, setProblem] = useState<SettingsProblem | null>(null);
  const [fixState, setFixState] = useState<FixState>('idle');

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    // getSettings ограничен по частоте (при входе его уже вызывали), поэтому повторяем с паузой.
    async function load() {
      for (let attempt = 0; ; attempt += 1) {
        try {
          const settings = await client.getSettings(signal);
          setProblem(findProblem(settings));
          return;
        } catch (error) {
          if (signal.aborted) return;
          const delay = SETTINGS_RETRY_DELAYS_MS[attempt];
          const isUnauthorized = error instanceof GreenApiError && error.isUnauthorized;
          if (delay === undefined || isUnauthorized) {
            // 401 покажет статус соединения, остальное — сообщаем, что не смогли проверить.
            if (!isUnauthorized) setProblem({ kind: 'loadFailed' });
            return;
          }
          await wait(delay, signal);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [client]);

  async function enableNotifications() {
    setFixState('saving');
    try {
      await client.setSettings(REQUIRED_NOTIFICATIONS);
      setFixState('saved');
    } catch (error) {
      setFixState({
        error: error instanceof GreenApiError ? error.message : 'Не удалось сохранить',
      });
    }
  }

  if (connection === 'unauthorized') {
    return (
      <div className={styles.banner} role="alert">
        <AlertIcon size={20} />
        <span className={styles.text}>Токен инстанса больше не действителен.</span>
        <Button variant="ghost" onClick={logout}>
          Войти заново
        </Button>
      </div>
    );
  }

  if (fixState === 'saved') {
    return (
      <div className={styles.banner} data-tone="success" role="status">
        <span className={styles.text}>
          Уведомления включены. Инстанс перезапускается — новые сообщения начнут приходить в течение
          ~5 минут.
        </span>
      </div>
    );
  }

  if (!problem) return null;

  if (problem.kind === 'webhook') {
    return (
      <div className={styles.banner} role="status">
        <AlertIcon size={20} />
        <span className={styles.text}>
          На инстансе указан webhookUrl — получение через HTTP API недоступно. Очистите его в личном
          кабинете.
        </span>
      </div>
    );
  }

  if (problem.kind === 'loadFailed') {
    return (
      <div className={styles.banner} role="status">
        <AlertIcon size={20} />
        <span className={styles.text}>
          Не удалось проверить настройки инстанса. Если ответы не приходят, включите уведомления в
          личном кабинете GREEN-API.
        </span>
      </div>
    );
  }

  return (
    <div className={styles.banner} role="status">
      <AlertIcon size={20} />
      <span className={styles.text}>
        {problem.incomingDisabled
          ? 'Уведомления о входящих выключены — ответы не будут приходить в чат.'
          : 'Уведомления о статусах выключены — не будет отметок «доставлено» и «прочитано».'}
        {typeof fixState === 'object' && <span className={styles.error}> {fixState.error}</span>}
      </span>
      <Button
        variant="ghost"
        onClick={() => void enableNotifications()}
        loading={fixState === 'saving'}
      >
        Включить
      </Button>
    </div>
  );
}
