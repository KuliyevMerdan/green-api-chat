import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Credentials } from '../api/types';
import type { InstanceType } from '../domain/instance';

export interface Session {
  credentials: Credentials;
  instanceType: InstanceType;
}

interface SessionStore {
  session: Session | null;
  login(session: Session): void;
  logout(): void;
}

/**
 * Сессия живёт в sessionStorage: переживает перезагрузку страницы,
 * но удаляется при закрытии вкладки и не попадает в другие вкладки.
 */
export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      session: null,
      login: (session) => set({ session }),
      logout: () => set({ session: null }),
    }),
    {
      name: 'green-max-session',
      version: 2,
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ session }) => ({ session }),
      // В v1 не было типа инстанса — такую сессию проще начать заново.
      migrate: () => ({ session: null }),
    },
  ),
);

/** Тип инстанса текущей сессии. Вызывается только внутри авторизованной части приложения. */
export function useInstanceType(): InstanceType {
  const instanceType = useSessionStore((s) => s.session?.instanceType);
  if (!instanceType) throw new Error('useInstanceType вызван без активной сессии');
  return instanceType;
}
