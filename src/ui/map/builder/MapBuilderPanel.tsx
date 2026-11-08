import { useTranslation } from 'react-i18next';
import type { DataPack, Game } from '../../../domain/types';
import { useGame } from '../../../state/gameStore';
import { TileNumberInput } from './TileNumberInput';

export interface MapBuilderPanelProps {
  slot: string;
  game: Game;
  pack: DataPack;
  /** Opens the big hex of the slot. */
  onOpenStage: () => void;
}

/** Sets the tile of one slot; once the slot holds a tile, its big hex can be opened. */
export function MapBuilderPanel({ slot, game, pack, onOpenStage }: MapBuilderPanelProps) {
  const { t } = useTranslation();
  const setTile = useGame(s => s.setTile);
  return (
    <>
      <TileNumberInput
        key={slot} pack={pack} value={game.map[slot]}
        onChange={value => setTile(slot, value)}
      />
      {game.map[slot] && <button type="button" className="tile-open-stage" onClick={onOpenStage}>{t('stage.open')}</button>}
    </>
  );
}
