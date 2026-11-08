import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorBanner } from './ErrorBanner';

function Fallback({ error }: { error: Error }) {
  const { t } = useTranslation();
  return (
    <div className="app">
      <ErrorBanner message={t('banner.crash', { error: error.message })} />
    </div>
  );
}

/** A crash in a screen does not blank the page silently: the error is shown, and the open game can still be saved to a file. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    return this.state.error ? <Fallback error={this.state.error} /> : this.props.children;
  }
}
