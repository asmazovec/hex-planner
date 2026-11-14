import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadPack } from '../data/loadPack';
import { readyToPlay } from '../domain/mapBuilder';
import { shareLinkQuery } from '../domain/shareLink';
import { useGame } from '../state/gameStore';
import { Banner } from './feedback/Banner';
import { downloadGame } from './common/download';
import { ErrorBanner } from './common/ErrorBanner';
import { ExportReminder } from './common/ExportReminder';
import { gameAddress } from './common/gameAddress';
import { lastView } from './common/preferences';
import { ShareConflict } from './common/ShareConflict';
import { RowIcon } from './primitives/Icon';
import { GameScreen } from './screens/GameScreen';
import { PlanScreen } from './screens/PlanScreen';

const SCREENS = ['game', 'plan'] as const;
type Screen = (typeof SCREENS)[number];

export function App() {
  const { t } = useTranslation();
  const game = useGame(s => s.game);
  const gameId = game?.id ?? null;
  const [screen, setScreen] = useState<Screen>(() => (gameId === null ? null : lastView.read(gameId)?.screen) ?? 'game');
  /** The plan's hint about an unfinished map leads to the map block of the game screen. */
  const [toMap, setToMap] = useState(false);
  const saveError = useGame(s => s.saveError);

  // A game that opens comes back to the screen it was left on: a page loaded again opens it from its link.
  const [openId, setOpenId] = useState(gameId);
  if (openId !== gameId) {
    setOpenId(gameId);
    const kept = gameId === null ? null : lastView.read(gameId);
    if (kept) setScreen(kept.screen);
  }

  // Without a game there is no plan to show, so the menu does not offer it. Leaving a game comes back here too.
  const shown: Screen = game ? screen : 'game';
  useEffect(() => {
    if (gameId !== null) lastView.write(gameId, { screen: shown });
  }, [gameId, shown]);

  // The address of an open game is its link: copy it and pass it on. No history entry, for it changes with every tile.
  const openSaved = useGame(s => s.saved);
  const query = game && openSaved ? shareLinkQuery(openSaved) : '';
  useEffect(() => {
    window.history.replaceState(null, '', gameAddress(query));
  }, [query]);

  /** A save set up to play opens on its plan and map; an unfinished one stays here to be finished. */
  const openedSave = () => {
    const opened = useGame.getState().game;
    if (opened && readyToPlay(opened, loadPack(opened.expansions))) { setScreen('plan'); setToMap(false); }
  };

  const dataMismatch =game !== null && game.dataVersion !== loadPack(game.expansions).version;

  return (
    <div className="app">
      {dataMismatch && <Banner kind="warning" message={t('game.dataVersionWarning')} />}
      {saveError && <ErrorBanner message={t('banner.saveError', { error: saveError })} />}
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
                onClick={() => { setScreen(id); setToMap(false); }}
              >
                <RowIcon name={id} />
              </button>
            ))}
            <ExportReminder game={game} onExport={() => downloadGame(game)} />
          </nav>
        )}
        <main data-screen={shown}>
          {shown === 'game' && <GameScreen showMap={toMap} onOpened={openedSave} />}
          {shown === 'plan' && <PlanScreen onFinishMap={() => { setScreen('game'); setToMap(true); }} />}
        </main>
      </div>
      <ShareConflict />
    </div>
  );
}
