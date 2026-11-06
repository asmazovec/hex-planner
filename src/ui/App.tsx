import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadPack } from '../data/loadPack';
import { useGame } from '../state/gameStore';
import { Banner } from './common/Banner';
import { downloadGame } from './common/download';
import { ExportReminder } from './common/ExportReminder';
import { RowIcon } from './plan/RowIcon';
import { GameScreen } from './screens/GameScreen';
import { PlanScreen } from './screens/PlanScreen';

const SCREENS = ['game', 'plan'] as const;
type Screen = (typeof SCREENS)[number];

export function App() {
  const { t } = useTranslation();
  const [screen, setScreen] = useState<Screen>('game');
  const game = useGame(s => s.game);
  const saveError = useGame(s => s.saveError);

  // Without a game there is no plan to show, so the menu does not offer it. Leaving a game comes back here too.
  const shown: Screen = game ? screen : 'game';

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
      <div className="app-body">
        {game && (
          <nav className="app-rail">
            {SCREENS.map((id) => (
              <button
                key={id}
                type="button"
                className="hex-button"
                aria-label={t(`menu.${id}`)}
                title={t(`menu.${id}`)}
                aria-current={shown === id ? 'page' : undefined}
                onClick={() => setScreen(id)}
              >
                <RowIcon name={id} />
              </button>
            ))}
            <ExportReminder game={game} onExport={() => downloadGame(game)} />
          </nav>
        )}
        <main data-screen={shown}>
          {shown === 'game' && <GameScreen />}
          {shown === 'plan' && <PlanScreen />}
        </main>
      </div>
    </div>
  );
}
