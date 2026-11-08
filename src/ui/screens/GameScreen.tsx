import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadPack } from '../../data/loadPack';
import { playersOf } from '../../domain/players';
import { homeNotes } from '../../domain/strategy';
import type { ExpansionId } from '../../domain/types';
import { currentLanguage, LANGUAGES, setLanguage } from '../../i18n';
import { flushSaves, useGame } from '../../state/gameStore';
import { deleteGame, listGames, loadRawGame, saveGame, type GameSummary } from '../../storage/db';
import { errorText } from '../../storage/errorText';
import { importGame, withFreeId } from '../../storage/transfer';
import { Banner } from '../feedback/Banner';
import { blur as blurSetting, energy as energySetting, flightLoop as flightLoopSetting } from '../common/preferences';
import { shareLinkQuery } from '../../domain/shareLink';
import { NoteField } from '../primitives/NoteField';
import { downloadGame, downloadRaw } from '../common/download';
import { EXPANSION_NAMES, EXPANSIONS } from '../common/expansions';
import { gameAddress } from '../common/gameAddress';
import { usePreference } from '../common/usePreference';
import { MapSetup } from '../map/builder/MapSetup';
import { HexRemove } from '../primitives/Icon';
import { factionName } from '../players/names';
import { PlayerList } from '../players/PlayerList';
import { useSeatDrag } from '../players/useSeatDrag';
import { SectionTitle } from '../primitives/SectionTitle';
import { ConfirmBar } from '../primitives/ConfirmBar';

export interface GameScreenProps {
  /** Brings the map block into view on opening, e.g. from the hint of an unfinished map. */
  showMap?: boolean;
}

/** The players on the left; expansions, the map with the seats and saved games on the right, language and settings last. */
export function GameScreen({ showMap = false }: GameScreenProps) {
  const { t } = useTranslation();
  const open = useGame(s => s.game);
  const game = useGame(s => s.game ?? s.draft);
  const openGame = useGame(s => s.openGame);
  const startGame = useGame(s => s.startGame);
  const closeGame = useGame(s => s.closeGame);
  const setDraftExpansions = useGame(s => s.setDraftExpansions);
  const swapSeats = useGame(s => s.swapSeats);
  const setName = useGame(s => s.setName);
  const loadFailure = useGame(s => s.loadFailure);
  const brokenSaves = useGame(s => s.brokenSaves);

  const [saved, setSaved] = useState<GameSummary[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  /** The saves could not be listed, or a step with one failed: the screen still works, the player is told. */
  const [storageError, setStorageError] = useState<string | null>(null);
  /** The save asked about before it goes: deleting cannot be undone. */
  const [asked, setAsked] = useState<string | null>(null);
  const [blur, setBlur] = usePreference(blurSetting);
  const [flightLoop, setFlightLoop] = usePreference(flightLoopSetting);
  const [energy, setEnergy] = usePreference(energySetting);
  const [linkCopied, setLinkCopied] = useState(false);

  const pack = useMemo(() => loadPack(game.expansions), [game.expansions]);
  const players = playersOf(game);
  const { ghostRef, ...drag } = useSeatDrag(players, swapSeats);
  const mapBlock = useRef<HTMLDivElement>(null);
  useEffect(() => { if (showMap) mapBlock.current?.scrollIntoView?.({ block: 'start' }); }, [showMap]);

  /** The list reloads after pending saves finish whenever the open game changes (new, opened, imported). */
  useEffect(() => {
    let live = true;
    flushSaves().then(listGames).then(
      list => { if (live) { setSaved(list); setStorageError(null); } },
      error => { if (live) { setSaved([]); setStorageError(t('load.listFailed', { error: errorText(error) })); } },
    );
    return () => { live = false; };
  }, [open?.id, loadFailure, t]);

  const toggle = (id: ExpansionId) => {
    const on = game.expansions.includes(id);
    setDraftExpansions(EXPANSIONS.filter(e => (e === id ? !on : game.expansions.includes(e))));
  };

  const remove = async (id: string) => {
    setAsked(null);
    if (open?.id === id) closeGame();
    try {
      // A save still queued for this game must not bring it back.
      await flushSaves();
      await deleteGame(id);
      setSaved(await listGames());
    } catch (error) {
      setStorageError(t('load.deleteFailed', { error: errorText(error) }));
    }
  };

  /** A save that does not open goes to a file as it lies, so nothing of it is lost. */
  const exportRaw = async (id: string) => {
    try {
      downloadRaw(id, await loadRawGame(id));
    } catch (error) {
      setStorageError(t('load.exportFailed', { error: errorText(error) }));
    }
  };

  const failedName = loadFailure?.id ? saved.find(s => s.id === loadFailure.id)?.name : undefined;

  /** A link to what stands on the screen: the map, the seats and the expansions, not the plans. */
  const copyLink = async () => {
    const link = gameAddress(shareLinkQuery(game), true);
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
      const imported = withFreeId(result.game, (await listGames()).map(g => g.id));
      await saveGame(imported);
      await openGame(imported.id);
      setImportError(null);
    } catch (error) {
      setImportError(errorText(error));
    }
  };

  return (
    <div className="players-screen">
      <div className="players-main">
        {importError && <Banner kind="error" message={t('import.failed', { reason: importError })} />}
        {loadFailure && (
          <Banner
            kind="error"
            message={loadFailure.id === null
              ? t('load.listFailed', { error: loadFailure.error })
              : t(failedName ? 'load.failedNamed' : 'load.failedBecause', { name: failedName, error: loadFailure.error })}
          />
        )}
        {storageError && <Banner kind="error" message={storageError} />}
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
          <SectionTitle as="p" className="side-label">{t('game.expansions')}</SectionTitle>
          <div className="chips">
            <span className="chip fix on">{t('players.base')}</span>
            {EXPANSIONS.map(id => {
              const label = EXPANSION_NAMES[id];
              const on = game.expansions.includes(id);
              if (open) return on ? <span key={id} className="chip fix on">{label}</span> : null;
              return <button key={id} type="button" className="chip" aria-pressed={on} onClick={() => toggle(id)}>{label}</button>;
            })}
          </div>
        </div>
        <MapSetup ref={mapBlock} game={game} pack={pack} drag={drag} ghostRef={ghostRef} started={Boolean(open)}>
          {open && homeNotes(open, pack).map(note => (
            <p key={`${note.kind}-${note.seat}`} className="side-note" role="status">
              {note.kind === 'foreign'
                ? t('game.homeForeign', { seat: note.seat, other: factionName(note.other), mine: factionName(note.mine) })
                : t('game.homeNone', { seat: note.seat })}
            </p>
          ))}
        </MapSetup>
        <div className="side-group">
          <SectionTitle as="p" className="side-label">{t('game.saved')}</SectionTitle>
          {saved.length === 0 && !storageError && <p className="side-note">{t('game.none')}</p>}
          <ul className="saved-list">
            {saved.map(s => {
              /** Listed as it is, with its export and deletion: a save that does not open is never dropped on its own. */
              const broken = s.broken || s.id in brokenSaves;
              return (
              <li key={s.id} className={broken ? 'saved-broken' : undefined}>
                <span>
                  <strong>{s.name ?? (s.faction ? factionName(s.faction) : s.id)}</strong>
                  {broken
                    ? <small role="status">{t('load.failed')}</small>
                    : <small>{[...(s.name ? [factionName(s.faction)] : []), t('game.playersShort', { count: s.playerCount })].join(' · ')}</small>}
                </span>
                {/* The card is the bar's frame: the answers stand where Open and the cross were. */}
                {asked === s.id
                  ? <ConfirmBar danger yes={t('game.deleteYes')} no={t('players.cancel')} onYes={() => void remove(s.id)} onNo={() => setAsked(null)} />
                  : (
                    <>
                      {broken
                        ? <button type="button" onClick={() => void exportRaw(s.id)}>{t('load.exportRaw')}</button>
                        : <button type="button" onClick={() => void openGame(s.id)}>{t('game.open')}</button>}
                      <HexRemove label={t('game.delete')} onClick={() => setAsked(s.id)} />
                    </>
                  )}
              </li>
              );
            })}
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
          <SectionTitle as="p" className="side-label" id="language-label">{t('players.language')}</SectionTitle>
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
          <SectionTitle as="p" className="side-label">{t('game.settings')}</SectionTitle>
          <div className="chips">
            <button type="button" className="chip" aria-pressed={energy} onClick={() => setEnergy(!energy)}>{t('game.energy')}</button>
            <button type="button" className="chip" aria-pressed={blur} disabled={energy} onClick={() => setBlur(!blur)}>{t('game.blur')}</button>
            <button type="button" className="chip" aria-pressed={flightLoop} disabled={energy} onClick={() => setFlightLoop(!flightLoop)}>{t('game.flightLoop')}</button>
          </div>
          {energy && <p className="side-note">{t('game.energyNote')}</p>}
        </div>
        <p className="side-note">
          {t('game.iconCredit')} <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">{t('game.iconLicence')}</a>
        </p>
      </aside>
    </div>
  );
}
