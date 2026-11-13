import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { holdingsOf, upgradesOf } from '../../domain/holdings';
import { countChangeEffect, maxPlayers, MIN_PLAYERS, opponentHoldings, playersOf } from '../../domain/players';
import type { UnitId, UpgradeId } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { usePack } from '../common/usePack';
import { FactionCard } from './FactionCard';
import { HexRemove } from '../primitives/Icon';
import { FactionPicker } from './FactionPicker';
import { ConfirmBar } from '../primitives/ConfirmBar';
import { playerStyle } from '../primitives/player';
import type { SeatDrag } from './useSeatDrag';

type Asked = { kind: 'add' } | { kind: 'remove'; opponent: number };

export interface PlayerListProps {
  /** Highlights from the seat map beside the list; the list works without one. */
  drag?: Pick<SeatDrag, 'picked' | 'lifted' | 'bumped' | 'clearBump'>;
  /** On the plan screen, where the list is a reference only: my ships in the state the map shows; opponents come from the game. Points are totals by player id. */
  live?: { upgraded: UpgradeId[]; /** Each opponent's upgraded types in the state shown, by id. */ rivalUpgraded?: Record<string, UpgradeId[]>; /** Space docks and PDS each player has on the board in the state shown, by id (me is `me`). */ structures?: Record<string, { docks: number; pds: number }>; locked: Partial<Record<UnitId, number>>; points: Record<string, number> };
}

/** The players of the open game, or of the draft before a game starts: one card each, everything visible, my faction first. */
export function PlayerList({ drag, live }: PlayerListProps) {
  const { t } = useTranslation();
  const game = useGame(s => s.game ?? s.draft);
  const setFaction = useGame(s => s.setFaction);
  const setOpponent = useGame(s => s.setOpponent);
  const addOpponent = useGame(s => s.addOpponent);
  const removeOpponent = useGame(s => s.removeOpponent);
  const setStartHolding = useGame(s => s.setStartHolding);
  const started = useGame(s => s.game !== null);
  const pack = usePack(game.expansions);
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
      <ConfirmBar
        className="player-confirm" text={texts.join(' ')} yes={t('players.confirmYes')} no={t('players.cancel')}
        onYes={() => (next.kind === 'add' ? add() : remove(next.opponent))} onNo={() => setAsked(null)}
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
            style={playerStyle('--player', player.color)}
          >
            <div className="player-row">
              <div className={badge.join(' ')} onAnimationEnd={drag?.clearBump}>{index + 1}</div>
              <div className="player-name">
                <div className="player-role">{t(index === 0 ? 'players.me' : 'players.opponent')}</div>
                {live ? <div className="fac fac-fixed">{faction?.name ?? player.faction}</div> : (
                  <FactionPicker
                    label={t(index === 0 ? 'players.me' : 'players.opponent')} value={player.faction} factions={factions} taken={taken} clearable={!(index === 0 && started)}
                    onPick={id => (index === 0 ? setFaction(id) : setOpponent(opponent, { faction: id }))}
                  />
                )}
              </div>
              {live && <div className="player-vp">{t('players.points')} <b>{live.points[player.id] ?? player.vp}</b></div>}
              {/* The question stands in for the cross that asked it. */}
              {index === 0 || live || (asked?.kind === 'remove' && asked.opponent === opponent) ? <span /> : (
                <HexRemove label={t('players.remove')} disabled={count <= MIN_PLAYERS} onClick={() => ask({ kind: 'remove', opponent })} />
              )}
            </div>
            {asked?.kind === 'remove' && asked.opponent === opponent && confirmBar(asked)}
            {faction && (
              <FactionCard
                faction={faction} pack={pack} expansions={game.expansions}
                chosen={(index === 0 ? game.start.me : game.start.opponents[player.id])?.technologies?.map(id => id.slice('technology:'.length))}
                onChoose={(id, take) => setStartHolding(index === 0 ? 'me' : player.id, `technology:${id}`, take)}
                live={live && {
                  upgraded: index === 0 ? live.upgraded : live.rivalUpgraded?.[player.id] ?? upgradesOf(holdingsOf(game.start.opponents[player.id]), pack),
                  locked: index === 0 ? live.locked : undefined,
                  structures: live.structures?.[player.id],
                }}
              />
            )}
          </article>
        );
      })}
      {asked?.kind === 'add' && confirmBar(asked)}
      {count < max && !live && !started && asked?.kind !== 'add' && (
        <button type="button" className="add-opponent" onClick={() => ask({ kind: 'add' })}>{t('players.add')}</button>
      )}
    </section>
  );
}
