import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../state/gameStore';
import { ErrorBanner } from './ErrorBanner';

function Fallback({ error }: { error: Error }) {
  const { t } = useTranslation();
  return (
    <div className="app">
      <ErrorBanner message={t('banner.crash', { error: error.message })} />
    </div>
  );
}

/**
 * A crash does not blank the page. With a game open, the game is what failed to draw: it closes, stays saved as it was,
 * and the app starts again on «Партия», which tells that the save could not be loaded. A crash with no game open shows
 * the error, so a crash there cannot loop.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
    const { saved, crashGame } = useGame.getState();
    if (!saved) return;
    crashGame(error.message || String(error));
    this.setState({ error: null });
  }

  render() {
    return this.state.error ? <Fallback error={this.state.error} /> : this.props.children;
  }
}
