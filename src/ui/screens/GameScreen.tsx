import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadPack } from '../../data/loadPack';
import { currentLanguage, setLanguage, type Language } from '../../i18n';
import type { ExpansionId } from '../../domain/types';
import { flushSaves, useGame } from '../../state/gameStore';
import { listGames, saveGame, type GameSummary } from '../../storage/db';
import { importGame } from '../../storage/transfer';
import { Banner } from '../common/Banner';
import { downloadGame } from '../common/download';

const EXPANSIONS: { id: ExpansionId; label: string }[] = [
  { id: 'pok', label: 'Prophecy of Kings' },
  { id: 'te', label: "Thunder's Edge" },
];

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
];

const allFactions = loadPack(['pok', 'te']).factions;

export function GameScreen() {
  const { t } = useTranslation();
  const game = useGame(s => s.game);
  const newGame = useGame(s => s.newGame);
  const openGame = useGame(s => s.openGame);
  const setOpponent = useGame(s => s.setOpponent);

  const [expansions, setExpansions] = useState<ExpansionId[]>([]);
  const [playerCount, setPlayerCount] = useState(6);
  const [faction, setFaction] = useState('');
  const [saved, setSaved] = useState<GameSummary[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  const pack = useMemo(() => loadPack(expansions), [expansions]);
  const openFactions = useMemo(() => Object.values(loadPack(game?.expansions ?? []).factions), [game?.expansions]);
  const factions = useMemo(() => Object.values(pack.factions), [pack]);
  const counts = pack.templates.map(template => template.playerCount);
  const chosenFaction = pack.factions[faction] ? faction : (factions[0]?.id ?? '');
  const chosenCount = counts.includes(playerCount) ? playerCount : (counts.at(-1) ?? playerCount);

  /** The list reloads after pending saves finish whenever the open game changes (new, opened, imported). */
  useEffect(() => {
    let live = true;
    flushSaves().then(listGames).then(list => live && setSaved(list), () => live && setSaved([]));
    return () => { live = false; };
  }, [game?.id]);

  const toggle = (id: ExpansionId) =>
    setExpansions(current => (current.includes(id) ? current.filter(e => e !== id) : [...current, id]));

  const start = () => {
    newGame({ expansions, playerCount: chosenCount, faction: chosenFaction }, pack);
    setImportError(null);
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
    <section className="screen game-screen">
      {importError && <Banner kind="error" message={t('import.failed', { reason: importError })} />}

      <div className="panel">
        <h2>{t('game.new')}</h2>
        <fieldset>
          <legend>{t('game.expansions')}</legend>
          {EXPANSIONS.map(({ id, label }) => (
            <label key={id} className="check">
              <input type="checkbox" checked={expansions.includes(id)} onChange={() => toggle(id)} />
              {label}
            </label>
          ))}
        </fieldset>
        <label className="field">
          {t('game.players')}
          <select value={chosenCount} onChange={e => setPlayerCount(Number(e.target.value))}>
            {counts.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="field">
          {t('game.faction')}
          <select value={chosenFaction} onChange={e => setFaction(e.target.value)}>
            {factions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
        <button type="button" className="primary" onClick={start}>{t('game.start')}</button>
      </div>

      {game && (
        <div className="panel">
          <h2>{t('rivals.title')}</h2>
          {game.opponents.map((opponent, index) => (
            <div key={index} role="group" aria-label={t('rivals.opponent', { n: index + 1 })} className="opponent">
              <label className="field">
                {t('rivals.opponent', { n: index + 1 })}
                <select value={opponent.faction} onChange={e => setOpponent(index, { faction: e.target.value })}>
                  <option value="">{t('rivals.unknown')}</option>
                  {openFactions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </label>
              <div className="row vp">
                <button type="button" aria-label={t('rivals.minus')}
                  onClick={() => setOpponent(index, { vp: Math.max(0, opponent.vp - 1) })}>−</button>
                <output aria-label={t('rivals.points')}>{opponent.vp}</output>
                <button type="button" aria-label={t('rivals.plus')}
                  onClick={() => setOpponent(index, { vp: opponent.vp + 1 })}>+</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="panel">
        <h2>{t('game.saved')}</h2>
        {saved.length === 0 && <p className="muted">{t('game.none')}</p>}
        <ul className="saved-list">
          {saved.map(s => (
            <li key={s.id}>
              <span>{allFactions[s.faction]?.name ?? s.faction} · {t('game.playersShort', { count: s.playerCount })}</span>
              <button type="button" onClick={() => void openGame(s.id)}>{t('game.open')}</button>
            </li>
          ))}
        </ul>
        <div className="row">
          <button type="button" disabled={!game} onClick={() => game && downloadGame(game)}>
            {t('game.export')}
          </button>
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
        <label className="field">
          {t('game.language')}
          <select value={currentLanguage()} onChange={e => setLanguage(e.target.value as Language)}>
            {LANGUAGES.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
          </select>
        </label>
      </div>
    </section>
  );
}
