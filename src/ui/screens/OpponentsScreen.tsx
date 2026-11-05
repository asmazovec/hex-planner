import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { loadPack } from '../../data/loadPack';
import { useGame } from '../../state/gameStore';

export function OpponentsScreen() {
  const { t } = useTranslation();
  const game = useGame(s => s.game);
  const setOpponent = useGame(s => s.setOpponent);
  const factions = useMemo(() => Object.values(loadPack(game?.expansions ?? []).factions), [game?.expansions]);

  if (!game) return <section className="screen"><p className="muted">{t('rivals.noGame')}</p></section>;

  return (
    <section className="screen rivals-screen">
      {game.opponents.map((opponent, index) => (
        <div key={index} role="group" aria-label={t('rivals.opponent', { n: index + 1 })} className="panel opponent">
          <h2>{t('rivals.opponent', { n: index + 1 })}</h2>
          <label className="field">
            {t('rivals.faction')}
            <select value={opponent.faction} onChange={e => setOpponent(index, { faction: e.target.value })}>
              <option value="">{t('rivals.unknown')}</option>
              {factions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
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
    </section>
  );
}
