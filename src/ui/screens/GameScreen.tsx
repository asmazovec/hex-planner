import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadPack } from '../../data/loadPack';
import { playersOf } from '../../domain/players';
import { homeNotes } from '../../domain/strategy';
import type { ExpansionId } from '../../domain/types';
import { currentLanguage, setLanguage, type Language } from '../../i18n';
import { flushSaves, useGame } from '../../state/gameStore';
import { deleteGame, listGames, saveGame, type GameSummary } from '../../storage/db';
import { importGame } from '../../storage/transfer';
import { Banner } from '../common/Banner';
import { blurOn, setBlur } from '../common/blur';
import { shareLinkQuery } from '../../domain/shareLink';
import { NoteField } from '../plan/EntryList';
import { downloadGame } from '../common/download';
import { flightLoopOn, setFlightLoop } from '../common/flightLoop';
import { LayoutPicker } from '../map/LayoutPicker';
import { HexRemove } from '../plan/RowIcon';
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

/** The players on the left; expansions, the seat map and saved games on the right, language and settings last. */
export function GameScreen() {
  const { t } = useTranslation();
  const open = useGame(s => s.game);
  const game = useGame(s => s.game ?? s.draft);
  const openGame = useGame(s => s.openGame);
  const startGame = useGame(s => s.startGame);
  const closeGame = useGame(s => s.closeGame);
  const setDraftExpansions = useGame(s => s.setDraftExpansions);
  const swapSeats = useGame(s => s.swapSeats);
  const setName = useGame(s => s.setName);

  const [saved, setSaved] = useState<GameSummary[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  /** The save asked about before it goes: deleting cannot be undone. */
  const [asked, setAsked] = useState<string | null>(null);
  const [blur, setBlurState] = useState(blurOn);
  const [flightLoop, setFlightLoopState] = useState(flightLoopOn);
  const [linkCopied, setLinkCopied] = useState(false);

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

  const remove = async (id: string) => {
    setAsked(null);
    if (open?.id === id) closeGame();
    // A save still queued for this game must not bring it back.
    await flushSaves();
    await deleteGame(id);
    setSaved(await listGames());
  };

  /** A link to what stands on the screen: the map, the seats and the expansions, not the plans. */
  const copyLink = async () => {
    const link = `${window.location.origin}${window.location.pathname}?${shareLinkQuery(game)}`;
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
    } catch {
      // No clipboard here, an insecure address for one: the address bar still carries the link.
      window.history.replaceState(null, '', link);
    }
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
        <PlayerList drag={drag} />
      </div>
      <aside className="players-aside">
        <div className="side-group">
          {/* The name is chosen before the game starts: a link finds the save by it. */}
          <NoteField key={game.id} label={t('game.name')} value={game.name ?? ''} disabled={Boolean(open)} onCommit={setName} />
          {!open && (
            <div className="start-game">
              <button type="button" className="primary" disabled={!game.faction} onClick={startGame}>{t('players.begin')}</button>
              {!game.faction && <span className="players-hint">{t('players.needFaction')}</span>}
            </div>
          )}
        </div>
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
          <p className="side-label">{t('players.seats')}</p>
          <SeatMap game={game} pack={pack} drag={drag} ghostRef={ghostRef} locked={Boolean(open)} />
          {!open && <p className="side-note">{t('players.seatsNote')}</p>}
          {open && homeNotes(open, pack).map(note => (
            <p key={`${note.kind}-${note.seat}`} className="side-note" role="status">
              {note.kind === 'foreign'
                ? t('game.homeForeign', { seat: note.seat, other: allFactions[note.other]?.name ?? note.other, mine: allFactions[note.mine]?.name ?? note.mine })
                : t('game.homeNone', { seat: note.seat })}
            </p>
          ))}
        </div>
        <LayoutPicker game={game} pack={pack} />
        <div className="side-group">
          <p className="side-label">{t('game.saved')}</p>
          {saved.length === 0 && <p className="side-note">{t('game.none')}</p>}
          <ul className="saved-list">
            {saved.map(s => (
              <li key={s.id}>
                <span>
                  <strong>{s.name ?? allFactions[s.faction]?.name ?? s.faction}</strong>
                  <small>{[...(s.name ? [allFactions[s.faction]?.name ?? s.faction] : []), t('game.playersShort', { count: s.playerCount })].join(' · ')}</small>
                </span>
                {asked === s.id
                  ? (
                    <>
                      <button type="button" className="danger" onClick={() => void remove(s.id)}>{t('game.deleteYes')}</button>
                      <button type="button" onClick={() => setAsked(null)}>{t('players.cancel')}</button>
                    </>
                  )
                  : (
                    <>
                      <button type="button" onClick={() => void openGame(s.id)}>{t('game.open')}</button>
                      <HexRemove label={t('game.delete')} onClick={() => setAsked(s.id)} />
                    </>
                  )}
              </li>
            ))}
          </ul>
          <div className="side-actions">
            {open && <button type="button" onClick={closeGame}>{t('players.newGame')}</button>}
            <button type="button" disabled={!open} onClick={() => open && downloadGame(open)}>{t('game.export')}</button>
            <button type="button" onClick={() => void copyLink()}>{t(linkCopied ? 'game.linkCopied' : 'game.copyLink')}</button>
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
          <p className="side-label">{t('game.settings')}</p>
          <div className="chips">
            <button type="button" className="chip" aria-pressed={blur} onClick={() => { setBlur(!blur); setBlurState(!blur); }}>{t('game.blur')}</button>
            <button type="button" className="chip" aria-pressed={flightLoop} onClick={() => { setFlightLoop(!flightLoop); setFlightLoopState(!flightLoop); }}>{t('game.flightLoop')}</button>
          </div>
        </div>
        <p className="side-note">
          {t('game.iconCredit')} <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">{t('game.iconLicence')}</a>
        </p>
      </aside>
    </div>
  );
}
