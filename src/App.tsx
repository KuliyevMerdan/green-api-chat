import { GreenApiProvider } from './api/GreenApiProvider';
import { LoginScreen } from './components/auth/LoginScreen';
import { Messenger } from './components/Messenger';
import { useSessionStore } from './store/sessionStore';

export function App() {
  const session = useSessionStore((s) => s.session);

  if (!session) return <LoginScreen />;

  const { credentials, instanceType } = session;
  return (
    // key: при смене инстанса пересоздаём всё дерево вместе с циклом получения уведомлений.
    <GreenApiProvider key={credentials.idInstance} credentials={credentials}>
      <Messenger idInstance={credentials.idInstance} instanceType={instanceType} />
    </GreenApiProvider>
  );
}
