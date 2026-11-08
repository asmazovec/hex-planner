import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../state/gameStore';
import { Banner } from './Banner';
import { downloadGame } from './download';

function Fallback({ error }: { error: Error }) {
  const { t } = useTranslation();
  const game = useGame(s => s.game);
  return (
    <div className="app">
      {/* TODO(P2-454) #ws:ui-structure #type:dup #size:s #banner — баннер ошибки с действием «Экспорт» повторяет saveError в App: общий баннер ошибки с экспортом открытой партии */}
      <Banner
        kind="error"
        message={t('banner.crash', { error: error.message })}
        action={game ? { label: t('banner.export'), onClick: () => downloadGame(game) } : undefined}
      />
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
