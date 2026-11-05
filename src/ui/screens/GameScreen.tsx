import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadPack } from '../../data/loadPack';
import { playersOf } from '../../domain/players';
import type { ExpansionId } from '../../domain/types';
import { currentLanguage, setLanguage, type Language } from '../../i18n';
import { flushSaves, useGame } from '../../state/gameStore';
import { listGames, saveGame, type GameSummary } from '../../storage/db';
import { importGame } from '../../storage/transfer';
import { Banner } from '../common/Banner';
import { downloadGame } from '../common/download';
import { LayoutPicker } from '../map/LayoutPicker';
import { PlayerList } from '../players/PlayerList';
import { SeatMap } from '../players/SeatMap';
import { useSeatDrag } from '../players/useSeatDrag';

const EXPANSIONS: { id: ExpansionId; label: string }[] = [
  { id: 'pok', label: 'Prophecy of Kings' },
  { id: 'te', label: "Thunder's Edge" },
];

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
];

const allFactions = loadPack(['pok', 'te']).factions;

/** The players on the left; expansions, language, the seat map and saved games on the right. */
export function GameScreen() {
  const { t } = useTranslation();
  const open = useGame(s => s.game);
  const game = useGame(s => s.game ?? s.draft);
  const openGame = useGame(s => s.openGame);
  const startGame = useGame(s => s.startGame);
  const closeGame = useGame(s => s.closeGame);
  const setDraftExpansions = useGame(s => s.setDraftExpansions);
  const swapSeats = useGame(s => s.swapSeats);

  const [saved, setSaved] = useState<GameSummary[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  const pack = useMemo(() => loadPack(game.expansions), [game.expansions]);
  const players = playersOf(game);
  const { ghostRef, ...drag } = useSeatDrag(players, swapSeats);

  /** The list reloads after pending saves finish whenever the open game changes (new, opened, imported). */
  useEffect(() => {
    let live = true;
    flushSaves().then(listGames).then(list => live && setSaved(list), () => live && setSaved([]));
    return () => { live = false; };
  }, [open?.id]);

  const toggle = (id: ExpansionId) => {
    const on = game.expansions.includes(id);
    setDraftExpansions(EXPANSIONS.map(e => e.id).filter(e => (e === id ? !on : game.expansions.includes(e))));
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const result = importGame(await file.text());
      if (!result.ok) {
        setImportError(t(`import.${result.reason}`));
        return;
      }
      const taken = (await listGames()).some(g => g.id === result.game.id);
      const imported = taken ? { ...result.game, id: `${result.game.id}-${Date.now().toString(36)}` } : result.game;
      await saveGame(imported);
      await openGame(imported.id);
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="players-screen">
      <div className="players-main">
        {importError && <Banner kind="error" message={t('import.failed', { reason: importError })} />}
        <PlayerList
          drag={drag}
          action={!open && (
            <>
              {!game.faction && <span className="players-hint">{t('players.needFaction')}</span>}
              <button type="button" className="primary" disabled={!game.faction} onClick={startGame}>{t('players.begin')}</button>
            </>
          )}
        />
      </div>
      <aside className="players-aside">
        <div className="side-group">
          <p className="side-label">{t('game.expansions')}</p>
          <div className="chips">
            <span className="chip fix on">{t('players.base')}</span>
            {EXPANSIONS.map(({ id, label }) => {
              const on = game.expansions.includes(id);
              if (open) return on ? <span key={id} className="chip fix on">{label}</span> : null;
              return <button key={id} type="button" className="chip" aria-pressed={on} onClick={() => toggle(id)}>{label}</button>;
            })}
          </div>
        </div>
        <div className="side-group">
          <p className="side-label" id="language-label">{t('players.language')}</p>
          <div className="chips" role="radiogroup" aria-labelledby="language-label">
            {LANGUAGES.map(({ code, label }) => (
              <button
                key={code} type="button" role="radio" className="chip" aria-checked={currentLanguage() === code}
                onClick={() => setLanguage(code)}
              >{label}</button>
            ))}
          </div>
        </div>
        <div className="side-group">
          <p className="side-label">{t('players.seats')}</p>
          <SeatMap game={game} pack={pack} drag={drag} ghostRef={ghostRef} />
          <p className="side-note">{t('players.seatsNote')}</p>
        </div>
        <LayoutPicker game={game} pack={pack} />
        <div className="side-group">
          <p className="side-label">{t('game.saved')}</p>
          {saved.length === 0 && <p className="side-note">{t('game.none')}</p>}
          <ul className="saved-list">
            {saved.map(s => (
              <li key={s.id}>
                <span>{allFactions[s.faction]?.name ?? s.faction} · {t('game.playersShort', { count: s.playerCount })}</span>
                <button type="button" onClick={() => void openGame(s.id)}>{t('game.open')}</button>
              </li>
            ))}
          </ul>
          <div className="side-actions">
            {open && <button type="button" onClick={closeGame}>{t('players.newGame')}</button>}
            <button type="button" disabled={!open} onClick={() => open && downloadGame(open)}>{t('game.export')}</button>
            <label className="button">
              {t('game.import')}
              <input
                type="file"
                accept="application/json,.json"
                className="visually-hidden"
                onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }}
              />
            </label>
          </div>
        </div>
        <p className="side-note">{t('game.iconCredit')}</p>
      </aside>
    </div>
  );
}
