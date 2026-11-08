import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { HEX_INNER } from '../../../domain/hexLayout';
import { rotateLanes } from '../../../domain/lanes';
import { duplicateTiles, freeSlots, seatSlots, slotsFor } from '../../../domain/mapBuilder';
import { MECATOL_PLANETS } from '../../../domain/mecatol';
import { playersOf } from '../../../domain/players';
import type { DataPack, Game, TileDef } from '../../../domain/types';
import { useGame } from '../../../state/gameStore';
import { Popover } from '../../overlays/Popover';
import { factionShortName } from '../../players/names';
import type { SeatDrag } from '../../players/useSeatDrag';
import { PlayerDot, playerStyle } from '../../primitives/player';
import { hexPoints, hexToPixel, mapBounds } from '../geometry';
import { lanePath } from '../TileView';
import { TileNumberInput } from './TileNumberInput';

/** About what the map block leaves for the minimap at its usual width. */
const BLOCK_WIDTH = 444;
/** The number of a free slot, in the map's own units: the viewBox scales it with the map. */
const NUMBER_SIZE = 26;
const TOKEN_RADIUS = 19;

const kindOf = (tile: TileDef | undefined): string => {
  if (!tile) return 'hex-free';
  if (tile.planetIds.some(id => MECATOL_PLANETS.includes(id))) return 'hex-mecatol';
  if (tile.kind !== 'system') return `hex-${tile.kind}`;
  return tile.anomaly ? 'hex-anomaly' : tile.wormholes.length > 0 ? 'hex-wormhole' : 'hex-system';
};

const centreOf = (key: string) => {
  const [q, r] = key.split(',').map(Number);
  return hexToPixel(q, r);
};

export interface TileMinimapProps {
  game: Game;
  pack: DataPack;
  drag: Omit<SeatDrag, 'ghostRef'>;
  ghostRef: SeatDrag['ghostRef'];
  /** The game has started: the seats are shown and no longer change; the tiles still do. */
  locked?: boolean;
}

/**
 * The map being built, small: every slot with its tile number. A tap on a free slot asks for its number; the centre,
 * the hyperlanes and the homes come by themselves. A token per player on the homes, seat 1 at the top: drag one onto
 * another, or tap one and then another, and the two players swap seats.
 */
export function TileMinimap({ game, pack, drag, ghostRef, locked = false }: TileMinimapProps) {
  const { t } = useTranslation();
  const setTile = useGame(s => s.setTile);
  const [selected, setSelected] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const players = playersOf(game);
  const slots = slotsFor(game.playerCount, pack, game.layout);
  const seats = seatSlots(game.playerCount, pack, game.layout);
  const free = new Set(freeSlots(game, pack));
  const dupes = new Set(duplicateTiles(game.map, pack));
  const box = mapBounds(slots);
  // 44 px across on screen, however far the map shrinks to fit the block.
  const hitRadius = (22 * box.width) / BLOCK_WIDTH;
  const dragged = drag.lifted === null ? null : players[drag.lifted];
  const nameOf = (faction: string) => pack.factions[faction]?.name ?? t('players.noFaction');
  // The slot asked about leaves with its slot, e.g. on a switch of layout.
  const open = selected !== null && free.has(selected) ? selected : null;

  const close = useCallback(() => setSelected(null), []);
  const anchor = useCallback((area: HTMLElement) => area.querySelector(`[data-slot="${open}"] polygon`), [open]);
  const place = (slot: string, value: string | null) => {
    setTile(slot, value);
    // A hyperlane stays open for its turn button.
    if (value === null || pack.tiles[value.split('@')[0]]?.kind !== 'hyperlane') setSelected(null);
  };

  const tileOf = (key: string) => {
    const value = game.map[key];
    const id = value?.split('@')[0];
    return { value, id, tile: id ? pack.tiles[id] : undefined };
  };
  const numberOf = (id: string | undefined, tile: TileDef | undefined) => (tile?.kind === 'hyperlane' ? tile.id : tile?.number ?? id);

  return (
    <div className="mini-wrap" ref={wrapRef}>
      <svg
        className="tile-mini" role="group" aria-label={t('builder.minimap')}
        viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`} width="100%"
      >
        {slots.map(slot => {
          const key = `${slot.q},${slot.r}`;
          const { x, y } = centreOf(key);
          const { value, id, tile } = tileOf(key);
          const number = numberOf(id, tile);
          const seat = seats.indexOf(key);
          const at = `translate(${x.toFixed(1)} ${y.toFixed(1)})`;
          if (seat >= 0) {
            const occupant = players.findIndex(p => p.seat === seat + 1);
            return (
              <g key={key} className="tile mini-fixed" transform={at} data-slot={key}>
                <polygon
                  points={hexPoints(HEX_INNER)} className="hex hex-home" data-seat={seat + 1} data-seat-spot={seat + 1}
                  onPointerDown={occupant >= 0 && !locked ? e => drag.onPointerDown(occupant, e) : undefined}
                />
                {number && <text className="mini-num" y={-33 + NUMBER_SIZE * 0.25} fontSize={NUMBER_SIZE * 0.7}>{number}</text>}
              </g>
            );
          }
          if (!free.has(key)) {
            const lanes = tile?.kind === 'hyperlane' && tile.lanes ? rotateLanes(tile.lanes, Number(value?.split('@')[1] ?? 0) % 6 || 0) : [];
            const lane = lanes.length > 0;
            return (
              <g key={key} className="tile mini-fixed" transform={at} data-slot={key} role="img" aria-label={number ? t('map.tile', { number }) : t('map.emptySlot')}>
                <polygon points={hexPoints(HEX_INNER)} className={`hex ${kindOf(tile)}`} />
                {lanes.map(l => <path key={l.join('-')} d={lanePath(l)} className="tile-lane" />)}
                {number && (
                  <text className="mini-num" y={lane ? -32 + NUMBER_SIZE * 0.22 : NUMBER_SIZE * 0.36} fontSize={lane ? NUMBER_SIZE * 0.62 : NUMBER_SIZE}>{number}</text>
                )}
              </g>
            );
          }
          const choose = () => setSelected(open === key ? null : key);
          return (
            <g
              key={key} transform={at} data-slot={key} role="button" tabIndex={0}
              className={`tile${id && dupes.has(id) ? ' mini-dup' : ''}${open === key ? ' tile-selected' : ''}`}
              aria-label={number ? t('builder.slotTile', { number }) : t('map.emptySlot')} aria-pressed={open === key}
              // A tap does not focus the slot: focus would scroll the page to it.
              onMouseDown={e => e.preventDefault()}
              onClick={choose}
              onKeyDown={(e: KeyboardEvent) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                choose();
              }}
            >
              <polygon points={hexPoints(HEX_INNER)} className={`hex ${kindOf(tile)}`} />
              {number
                ? <text className="mini-num" y={NUMBER_SIZE * 0.36} fontSize={NUMBER_SIZE}>{number}</text>
                : <text className="mini-num mini-empty" y={NUMBER_SIZE * 0.36} fontSize={NUMBER_SIZE}>—</text>}
            </g>
          );
        })}
        {players.map((player, index) => {
          const key = seats[player.seat - 1];
          if (!key) return null;
          const { x, y } = centreOf(key);
          const faction = pack.factions[player.faction];
          const classes = ['seat-token'];
          if (index === 0) classes.push('seat-token-me');
          if (locked) classes.push('seat-token-locked');
          if (drag.picked === index) classes.push('picked');
          if (drag.lifted !== null) classes.push('target');
          if (drag.hoverSeat === player.seat && drag.lifted !== index) classes.push('hover');
          return (
            // The colour is the player's for good, so the token keeps its element and glides to a new seat.
            <g key={player.color} className="seat-move" style={{ transform: `translate(${x}px, ${y + 6}px)` }}>
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
                <circle r={TOKEN_RADIUS} className="seat-disc" style={playerStyle('fill', player.color)} />
                <circle r={hitRadius} className="seat-hit" />
                <text y="7">{index + 1}</text>
              </g>
              {faction && <text y="40" className="seat-caption">{factionShortName(faction.id, faction.name)}</text>}
            </g>
          );
        })}
      </svg>
      {open && (
        <Popover
          className="tile-popover" data-slot-popover={open} anchor={anchor} areaRef={wrapRef} keepOpenIn=".tile-mini"
          closeLabel={t('map.sheet.close')} onClose={close}
        >
          <TileNumberInput key={open} pack={pack} value={game.map[open]} onChange={value => place(open, value)} />
        </Popover>
      )}
      {createPortal(
        <div ref={ghostRef} className="seat-ghost">
          {dragged && drag.lifted !== null && (
            <>
              <PlayerDot color={dragged.color} className="seat-ghost-badge">{drag.lifted + 1}</PlayerDot>
              <span>
                <small>{t(drag.lifted === 0 ? 'players.me' : 'players.opponent')}</small>
                <b>{nameOf(dragged.faction)}</b>
              </span>
            </>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
