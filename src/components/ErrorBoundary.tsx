import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.VITE_SENTRY_DSN) {
      import('@sentry/react').then((Sentry) =>
        Sentry.captureException(error, { contexts: { react: { componentStack: info.componentStack } } }),
      );
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-md space-y-4 p-6 text-center">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <button onClick={() => window.location.reload()} className="border px-4 py-2">Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
