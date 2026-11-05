import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadPack } from '../data/loadPack';
import { useGame } from '../state/gameStore';
import { Banner } from './common/Banner';
import { downloadGame } from './common/download';
import { GameScreen } from './screens/GameScreen';
import { PlanScreen } from './screens/PlanScreen';

const SCREENS = ['game', 'plan'] as const;
type Screen = (typeof SCREENS)[number];

export function App() {
  const { t } = useTranslation();
  const [screen, setScreen] = useState<Screen>('game');
  const game = useGame(s => s.game);
  const saveError = useGame(s => s.saveError);

  const dataMismatch = game !== null && game.dataVersion !== loadPack(game.expansions).version;

  return (
    <div className="app">
      {dataMismatch && <Banner kind="warning" message={t('game.dataVersionWarning')} />}
      {saveError && (
        <Banner
          kind="error"
          message={t('banner.saveError', { error: saveError })}
          action={game ? { label: t('banner.export'), onClick: () => downloadGame(game) } : undefined}
        />
      )}
      <main data-screen={screen}>
        {screen === 'game' && <GameScreen />}
        {screen === 'plan' && <PlanScreen />}
      </main>
      <nav>
        {SCREENS.map((id) => (
          <button
            key={id}
            type="button"
            aria-current={screen === id ? 'page' : undefined}
            onClick={() => setScreen(id)}
          >
            {t(`menu.${id}`)}
          </button>
        ))}
      </nav>
    </div>
  );
}
