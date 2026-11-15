import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { holdingsOf, upgradesOf } from '../../domain/holdings';
import { boardHoldings, countChangeEffect, maxPlayers, MIN_PLAYERS, seatedPlayers } from '../../game/edit/table';
import type { UnitId, UpgradeId } from '../../domain/types';
import type { PlayerId } from '../../game/types';
import { useGame } from '../../state/gameStore';
import { usePack } from '../common/usePack';
import { FactionCard } from './FactionCard';
import { HexRemove } from '../primitives/Icon';
import { FactionPicker } from './FactionPicker';
import { ConfirmBar } from '../primitives/ConfirmBar';
import { playerStyle } from '../primitives/player';
import type { SeatDrag } from './useSeatDrag';

type Asked = { kind: 'add' } | { kind: 'remove'; player: PlayerId };

export interface PlayerListProps {
  /** Highlights from the seat map beside the list; the list works without one. */
  drag?: Pick<SeatDrag, 'picked' | 'lifted' | 'bumped' | 'clearBump'>;
  /** On the plan screen, where the list is a reference only, everything by player id in the state the map shows: the upgraded types, the space docks and PDS on the board, the rounds in which entries of the plan upgrade a type (not to toggle by hand), the points in total. */
  live?: { upgraded: Record<PlayerId, UpgradeId[]>; structures?: Record<PlayerId, { docks: number; pds: number }>; locked: Record<PlayerId, Partial<Record<UnitId, number>>>; points: Record<PlayerId, number> };
}

/**
 * The players of the open game, or of the draft before a game starts: one card each by seat, every card the same. One of
 * them is marked as the one at the tablet; before the game starts the mark is a choice among the cards.
 */
export function PlayerList({ drag, live }: PlayerListProps) {
  const { t } = useTranslation();
  const saved = useGame(s => s.saved ?? s.draftSaved);
  const { table } = saved;
  const setFaction = useGame(s => s.setFaction);
  const addPlayer = useGame(s => s.addPlayer);
  const removePlayer = useGame(s => s.removePlayer);
  const setViewer = useGame(s => s.setViewer);
  const setStartHolding = useGame(s => s.setStartHolding);
  const started = useGame(s => s.saved !== null);
  const pack = usePack(table.expansions);
  const factions = useMemo(
    () => Object.values(pack.factions).sort((a, b) => a.name.localeCompare(b.name, 'en')),
    [pack],
  );
  const [asked, setAsked] = useState<Asked | null>(null);
  const [fresh, setFresh] = useState<number | null>(null);
  const listRef = useRef<HTMLElement>(null);

  const players = seatedPlayers(table).map(p => ({ ...p, vp: saved.start.points[p.id] ?? 0 }));
  const count = players.length;
  const max = maxPlayers(pack);

  const add = () => {
    addPlayer();
    const now = useGame.getState();
    setFresh(seatedPlayers((now.saved ?? now.draftSaved).table).at(-1)?.color ?? null);
    setAsked(null);
  };
  useEffect(() => {
    if (fresh !== null) listRef.current?.scrollTo?.({ top: 1e6, behavior: 'smooth' });
  }, [fresh]);
  const remove = (player: PlayerId) => {
    removePlayer(player);
    setAsked(null);
  };
  const effectOf = (next: Asked) => ({
    ...countChangeEffect(table, next.kind === 'add' ? count + 1 : count - 1, pack),
    held: next.kind === 'remove' ? boardHoldings(saved.start, next.player) : { units: 0, planets: 0 },
  });
  const ask = (next: Asked) => {
    const { filled, held } = effectOf(next);
    if (filled > 0 || held.units > 0 || held.planets > 0) setAsked(next);
    else if (next.kind === 'add') add();
    else remove(next.player);
  };
  const confirmBar = (next: Asked) => {
    const { filled, lost, held } = effectOf(next);
    const texts = [];
    if (held.units > 0 || held.planets > 0) texts.push(t('players.confirmHoldings', held));
    if (filled > 0) texts.push(t('players.confirm', { filled, lost }));
    return (
      <ConfirmBar
        className="player-confirm" text={texts.join(' ')} yes={t('players.confirmYes')} no={t('players.cancel')}
        onYes={() => (next.kind === 'add' ? add() : remove(next.player))} onNo={() => setAsked(null)}
      />
    );
  };

  return (
    <section ref={listRef} className="players-list">
      <div className="players-head">
        {/* The page's own heading on the game screen; in a drawer it is the sheet's title, as in the other drawers. */}
        {live ? <h2>{t('players.title')}</h2> : <h1>{t('players.title')}</h1>}
        <span>{t('players.count', { n: count, max })}</span>
      </div>
      {players.map((player, index) => {
        const faction = pack.factions[player.faction];
        const taken = new Set(players.filter((_, i) => i !== index).map(p => p.faction));
        const classes = ['player-card'];
        const atTablet = player.id === table.viewer;
        const who = t('players.player', { n: player.seat });
        if (atTablet) classes.push('own');
        if (player.color === fresh) classes.push('fresh');
        if (drag?.lifted === index) classes.push('lifted');
        const badge = ['player-badge'];
        if (drag?.picked === index) badge.push('picked');
        if (drag?.bumped.includes(player.color)) badge.push('bump');
        const leaving = asked?.kind === 'remove' && asked.player === player.id;
        return (
          <article
            key={player.color} role="group" aria-label={who} className={classes.join(' ')}
            style={playerStyle('--player', player.color)}
          >
            <div className="player-row">
              <div className={badge.join(' ')} onAnimationEnd={drag?.clearBump}>{player.seat}</div>
              <div className="player-name">
                <div className="player-role">{who}</div>
                {live ? <div className="fac fac-fixed">{faction?.name ?? player.faction}</div> : (
                  <FactionPicker
                    label={t('players.factionOf', { n: player.seat })} value={player.faction} factions={factions} taken={taken}
                    // The plans are those of the player at the tablet, so that one keeps a faction once the game has begun.
                    clearable={!(atTablet && started)} onPick={id => setFaction(player.id, id)}
                  />
                )}
              </div>
              {live && <div className="player-vp">{t('players.points')} <b>{live.points[player.id] ?? player.vp}</b></div>}
              {/* Who sits at the tablet: a choice among the cards until the game starts, a mark on one card after. */}
              {started || live
                ? (atTablet ? <span className="chip fix on">{t('players.tablet')}</span> : <span />)
                : (
                  <button
                    type="button" role="radio" className="chip" aria-checked={atTablet} aria-label={t('players.tabletOf', { n: player.seat })}
                    onClick={() => setViewer(player.id)}
                  >{t('players.tablet')}</button>
                )}
              {/* The question stands in for the cross that asked it. */}
              {live || leaving ? <span /> : (
                <HexRemove label={t('players.removeOf', { n: player.seat })} disabled={count <= MIN_PLAYERS} onClick={() => ask({ kind: 'remove', player: player.id })} />
              )}
            </div>
            {leaving && asked && confirmBar(asked)}
            {faction && (
              <FactionCard
                faction={faction} pack={pack} expansions={table.expansions}
                chosen={saved.start.holdings[player.id]?.technologies?.map(id => id.slice('technology:'.length))}
                onChoose={(id, take) => setStartHolding(player.id, `technology:${id}`, take)}
                live={live && {
                  upgraded: live.upgraded[player.id] ?? upgradesOf(holdingsOf(saved.start.holdings[player.id]), pack),
                  locked: live.locked[player.id],
                  structures: live.structures?.[player.id],
                }}
              />
            )}
          </article>
        );
      })}
      {asked?.kind === 'add' && confirmBar(asked)}
      {count < max && !live && !started && asked?.kind !== 'add' && (
        <button type="button" className="add-player" onClick={() => ask({ kind: 'add' })}>{t('players.add')}</button>
      )}
    </section>
  );
}
