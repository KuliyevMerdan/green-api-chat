import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './ui/Button';

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Последний рубеж: вместо белого экрана показывает сообщение и кнопку перезагрузки. */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Необработанная ошибка интерфейса', error, info.componentStack);
  }

  override render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div role="alert" style={{ display: 'grid', placeItems: 'center', height: '100%', gap: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <p>Что-то пошло не так.</p>
          <Button onClick={() => window.location.reload()}>Перезагрузить</Button>
        </div>
      </div>
    );
  }
}
