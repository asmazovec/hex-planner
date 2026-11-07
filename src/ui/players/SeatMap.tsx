import type { KeyboardEvent, PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { seatSlots, slotsFor } from '../../domain/mapBuilder';
import { playersOf } from '../../domain/players';
import type { DataPack, Game } from '../../domain/types';
import { factionShortName } from './factionName';
import type { SeatDrag } from './useSeatDrag';

const STEP_X = 39;
const STEP_Y = 45;
const HEX_RADIUS = 25;
/** What the side panel leaves for the map at its usual width. */
const SIDE_PANEL_WIDTH = 294;

/** The small map is not to scale of the big one: slightly apart hexes, so tokens stand out. */
const position = (q: number, r: number): [number, number] => [STEP_X * q, STEP_Y * (r + q / 2)];
const parseSlot = (key: string): [number, number] => {
  const [q, r] = key.split(',').map(Number);
  return position(q, r);
};
const hexPoints = (x: number, y: number): string => Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 3) * i;
  return `${(x + HEX_RADIUS * Math.cos(angle)).toFixed(1)},${(y + HEX_RADIUS * Math.sin(angle)).toFixed(1)}`;
}).join(' ');

export interface SeatMapProps {
  game: Game;
  pack: DataPack;
  drag: Omit<SeatDrag, 'ghostRef'>;
  ghostRef: SeatDrag['ghostRef'];
  /** The game has started: the seats are shown and no longer change. */
  locked?: boolean;
}

/** Who sits where: a token per player on the home positions, seat 1 at the top and then clockwise. */
export function SeatMap({ game, pack, drag, ghostRef, locked = false }: SeatMapProps) {
  const { t } = useTranslation();
  const players = playersOf(game);
  const slots = slotsFor(game.playerCount, pack, game.layout);
  const seats = seatSlots(game.playerCount, pack, game.layout);
  const rings = Math.max(0, ...slots.map(s => Math.max(Math.abs(s.q), Math.abs(s.r), Math.abs(s.q + s.r))));
  const halfWidth = STEP_X * rings + 43;
  const halfHeight = STEP_Y * rings + 35;
  // The caption keeps its size on screen when a bigger map shrinks.
  const captionSize = (10 * halfWidth) / (STEP_X * 3 + 43);
  // 44 px across on screen, however far the map shrinks to fit the side panel.
  const hitRadius = (22 * 2 * halfWidth) / SIDE_PANEL_WIDTH;
  const dragged = drag.lifted === null ? null : players[drag.lifted];
  const nameOf = (faction: string) => pack.factions[faction]?.name ?? t('players.noFaction');

  return (
    <>
      <svg
        className="seat-map" role="group" aria-label={t('players.seatsMap')}
        viewBox={`${-halfWidth} ${-halfHeight} ${halfWidth * 2} ${halfHeight * 2}`} width="100%"
      >
        {slots.map(s => {
          const [x, y] = position(s.q, s.r);
          return <polygon key={`${s.q},${s.r}`} points={hexPoints(x, y)} className="seat-cell" />;
        })}
        {seats.map((key, i) => {
          const [x, y] = parseSlot(key);
          const occupant = players.findIndex(p => p.seat === i + 1);
          return (
            <polygon
              key={key} points={hexPoints(x, y)} className="seat-spot" data-seat={i + 1} data-seat-spot={i + 1}
              onPointerDown={occupant >= 0 && !locked ? e => drag.onPointerDown(occupant, e) : undefined}
            />
          );
        })}
        {players.map((player, index) => {
          const key = seats[player.seat - 1];
          if (!key) return null;
          const [x, y] = parseSlot(key);
          const faction = pack.factions[player.faction];
          const classes = ['seat-token'];
          if (index === 0) classes.push('seat-token-me');
          if (locked) classes.push('seat-token-locked');
          if (drag.picked === index) classes.push('picked');
          if (drag.lifted !== null) classes.push('target');
          if (drag.hoverSeat === player.seat && drag.lifted !== index) classes.push('hover');
          return (
            // The colour is the player's for good, so the token keeps its element and glides to a new seat.
            <g key={player.color} className="seat-move" style={{ transform: `translate(${x}px, ${y}px)` }}>
              <g
                className={classes.join(' ')} data-seat={player.seat}
                aria-label={t('players.token', { n: index + 1, name: nameOf(player.faction), seat: player.seat })}
                {...(locked ? { role: 'img' } : {
                  role: 'button', tabIndex: 0, 'aria-pressed': drag.picked === index,
                  onPointerDown: (e: PointerEvent) => drag.onPointerDown(index, e),
                  onKeyDown: (e: KeyboardEvent) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    drag.tap(index);
                  },
                })}
              >
                <circle r="17" className="seat-disc" style={{ fill: `var(--player-${player.color})` }} />
                <circle r={hitRadius} className="seat-hit" />
                <text y="6">{index + 1}</text>
              </g>
              {faction && <text y="29" className="seat-caption" style={{ fontSize: captionSize }}>{factionShortName(faction.id, faction.name)}</text>}
            </g>
          );
        })}
      </svg>
      {createPortal(
        <div ref={ghostRef} className="seat-ghost">
          {dragged && drag.lifted !== null && (
            <>
              <span className="seat-ghost-badge" style={{ background: `var(--player-${dragged.color})` }}>{drag.lifted + 1}</span>
              <span>
                <small>{t(drag.lifted === 0 ? 'players.me' : 'players.opponent')}</small>
                <b>{nameOf(dragged.faction)}</b>
              </span>
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
