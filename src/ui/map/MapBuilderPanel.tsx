import type { DataPack, Game, GameState } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { TileNumberInput } from './TileNumberInput';
import { TileSheet } from './TileSheet';

export interface MapBuilderPanelProps {
  slot: string;
  game: Game;
  pack: DataPack;
  state: GameState;
}

/** Sets the tile of one slot; once the slot holds a tile, its details follow. */
export function MapBuilderPanel({ slot, game, pack, state }: MapBuilderPanelProps) {
  const setTile = useGame(s => s.setTile);
  return (
    <>
      <TileNumberInput
        key={slot} pack={pack} value={game.map[slot]}
        onChange={value => setTile(slot, value)}
      />
      {game.map[slot] && <TileSheet slotKey={slot} pack={pack} game={game} state={state} />}
    </>
  );
}
