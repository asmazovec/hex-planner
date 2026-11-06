import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { loadPack } from '../../data/loadPack';
import { countChangeEffect, maxPlayers, MIN_PLAYERS, opponentHoldings, playersOf } from '../../domain/players';
import type { UnitId } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { FactionCard } from '../plan/FactionCard';
import type { SeatDrag } from './useSeatDrag';

type Asked = { kind: 'add' } | { kind: 'remove'; opponent: number };

export interface PlayerListProps {
  /** Highlights from the seat map beside the list; the list works without one. */
  drag?: Pick<SeatDrag, 'picked' | 'lifted' | 'bumped' | 'clearBump'>;
  /** Stands at the end of the heading. */
  action?: ReactNode;
  /** On the plan screen: my ships in the state the map shows; opponents come from the game. Rows toggle upgrades. Points are totals by player id, read only. */
  live?: { upgraded: UnitId[]; locked: Partial<Record<UnitId, number>>; points: Record<string, number> };
}

/** The players of the open game, or of the draft before a game starts: one card each, everything visible, my faction first. */
export function PlayerList({ drag, action, live }: PlayerListProps) {
  const { t } = useTranslation();
  const game = useGame(s => s.game ?? s.draft);
  const setFaction = useGame(s => s.setFaction);
  const setOpponent = useGame(s => s.setOpponent);
  const addOpponent = useGame(s => s.addOpponent);
  const removeOpponent = useGame(s => s.removeOpponent);
  const toggleUpgrade = useGame(s => s.toggleUpgrade);
  const started = useGame(s => s.game !== null);
  const pack = useMemo(() => loadPack(game.expansions), [game.expansions]);
  const factions = useMemo(
    () => Object.values(pack.factions).sort((a, b) => a.name.localeCompare(b.name, 'en')),
    [pack],
  );
  const [asked, setAsked] = useState<Asked | null>(null);
  const [fresh, setFresh] = useState<number | null>(null);
  const listRef = useRef<HTMLElement>(null);

  const players = playersOf(game);
  const count = players.length;
  const max = maxPlayers(pack);

  const add = () => {
    addOpponent();
    const { game: open, draft } = useGame.getState();
    setFresh((open ?? draft).opponents.at(-1)?.color ?? null);
    setAsked(null);
  };
  useEffect(() => {
    if (fresh !== null) listRef.current?.scrollTo?.({ top: 1e6, behavior: 'smooth' });
  }, [fresh]);
  const remove = (opponent: number) => {
    removeOpponent(opponent);
    setAsked(null);
  };
  const effectOf = (next: Asked) => ({
    ...countChangeEffect(game, next.kind === 'add' ? count + 1 : count - 1, pack),
    held: next.kind === 'remove' ? opponentHoldings(game, game.opponents[next.opponent].id) : { units: 0, planets: 0 },
  });
  const ask = (next: Asked) => {
    const { filled, held } = effectOf(next);
    if (filled > 0 || held.units > 0 || held.planets > 0) setAsked(next);
    else if (next.kind === 'add') add();
    else remove(next.opponent);
  };
  const confirmBar = (next: Asked) => {
    const { filled, lost, held } = effectOf(next);
    const texts = [];
    if (held.units > 0 || held.planets > 0) texts.push(t('players.confirmHoldings', held));
    if (filled > 0) texts.push(t('players.confirm', { filled, lost }));
    return (
      <div className="player-confirm">
        <span>{texts.join(' ')}</span>
        <button type="button" className="primary" onClick={() => (next.kind === 'add' ? add() : remove(next.opponent))}>{t('players.confirmYes')}</button>
        <button type="button" onClick={() => setAsked(null)}>{t('players.cancel')}</button>
      </div>
    );
  };

  return (
    <section ref={listRef} className="players-list">
      <div className="players-head">
        <h1>{t('players.title')}</h1>
        <span>{t('players.count', { n: count, max })}</span>
        {action && <div className="players-action">{action}</div>}
      </div>
      {players.map((player, index) => {
        const faction = pack.factions[player.faction];
        const taken = new Set(players.filter((_, i) => i !== index).map(p => p.faction));
        const classes = ['player-card'];
        if (index === 0) classes.push('me');
        if (player.color === fresh) classes.push('fresh');
        if (drag?.lifted === index) classes.push('lifted');
        const badge = ['player-badge'];
        if (drag?.picked === index) badge.push('picked');
        if (drag?.bumped.includes(player.color)) badge.push('bump');
        const opponent = index - 1;
        return (
          <article
            key={player.color} role="group" aria-label={t('players.player', { n: index + 1 })} className={classes.join(' ')}
            style={{ '--player': `var(--player-${player.color})` } as React.CSSProperties}
          >
            <div className="player-row">
              <div className={badge.join(' ')} onAnimationEnd={drag?.clearBump}>{index + 1}</div>
              <div className="player-name">
                <div className="player-role">{t(index === 0 ? 'players.me' : 'players.opponent')}</div>
                <select
                  className="fac" aria-label={t(index === 0 ? 'players.me' : 'players.opponent')} value={player.faction}
                  onChange={e => (index === 0 ? setFaction(e.target.value) : setOpponent(opponent, { faction: e.target.value }))}
                >
                  <option value="" disabled={index === 0 && started}>{t('players.choose')}</option>
                  {factions.map(f => <option key={f.id} value={f.id} disabled={taken.has(f.id)}>{f.name}</option>)}
                </select>
              </div>
              {live && <div className="player-vp">{t('players.points')} <b>{live.points[player.id] ?? player.vp}</b></div>}
              {index === 0 ? <span /> : (
                <button
                  type="button" className="icon-button" aria-label={t('players.remove')} title={t('players.remove')}
                  disabled={count <= MIN_PLAYERS} onClick={() => ask({ kind: 'remove', opponent })}
                >✕</button>
              )}
            </div>
            {asked?.kind === 'remove' && asked.opponent === opponent && confirmBar(asked)}
            {faction && (
              <FactionCard
                faction={faction} pack={pack}
                live={live && {
                  upgraded: index === 0 ? live.upgraded : game.upgrades.opponents[player.id],
                  locked: index === 0 ? live.locked : undefined,
                  onToggle: unit => toggleUpgrade(player.id, unit),
                }}
              />
            )}
          </article>
        );
      })}
      {asked?.kind === 'add' && confirmBar(asked)}
      {count < max && (
        <button type="button" className="add-opponent" onClick={() => ask({ kind: 'add' })}>{t('players.add')}</button>
      )}
    </section>
  );
}
