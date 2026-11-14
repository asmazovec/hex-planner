/** The map and its tile for tests that build a game and a state in the old shapes: they are turned into the table and board the screens read. */
import { useMemo, type ComponentProps } from 'react';
import { boardFromLegacy, tableOf } from '../../testing/old/game/fromLegacy';
import { startOf } from '../../testing/old/domain/replay/start';
import { holderIn } from '../../testing/old/domain/stacks';
import type { DataPack, Game } from '../../domain/types';
import type { GameState } from '../../testing/old/domain/types';
import { HexMap } from '../map/HexMap';
import { TileView } from '../map/TileView';

/** The table of a game, and the board that holds `state` as mine and what the game itself places for the opponents (units set by hand, who holds what). */
export function viewOf(game: Game, state: GameState, pack: DataPack) {
  const table = tableOf(game);
  const start = startOf(game, pack);
  const rivals: Record<string, GameState> = { ...start.rivals, ...state.rivals };
  const control = { ...state.control };
  // A structure stands on a planet its owner holds; a planet the state calls an enemy's is held by the opponent the game names.
  for (const id of [...state.docks, ...Object.keys(state.pds)]) control[id] ??= 'me';
  for (const [id, who] of Object.entries(state.control)) {
    const holder = who === 'enemy' ? holderIn(game, state, id) : undefined;
    if (holder && rivals[holder]) rivals[holder] = { ...rivals[holder], control: { ...rivals[holder].control, [id]: 'me' } };
  }
  for (const [key, held] of Object.entries(rivals)) {
    const owned = { ...held.control };
    for (const id of [...held.docks, ...Object.keys(held.pds)]) owned[id] ??= 'me';
    rivals[key] = { ...held, control: owned };
  }
  return { table, board: boardFromLegacy(table, { ...state, control, rivals }, pack) };
}

type Old = { game: Game; state: GameState; pack: DataPack };

export function LegacyTile({ game, state, pack, ...rest }: Old & Omit<ComponentProps<typeof TileView>, 'table' | 'board' | 'pack'>) {
  const view = useMemo(() => viewOf(game, state, pack), [game, state, pack]);
  return <TileView pack={pack} {...view} {...rest} />;
}

export function LegacyMap({ game, state, pack, ...rest }: Old & Omit<ComponentProps<typeof HexMap>, 'table' | 'board' | 'pack'>) {
  const view = useMemo(() => viewOf(game, state, pack), [game, state, pack]);
  return <HexMap pack={pack} {...view} {...rest} />;
}
