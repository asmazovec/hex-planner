import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import type { CardEntry } from '../../../../domain/strategy';
import type { CardEffects, DataPack, Warning } from '../../../../domain/types';
import type { CardPatch } from '../../../../game/edit/strategic';
import type { CardTurn } from '../../../../game/edit/strategicRead';
import { legacyKey } from '../../../../game/keys';
import type { Round } from '../../../../game/round';
import type { Board, PlayerId, Table } from '../../../../game/types';
import type { WarningPlacer } from '../../../feedback/warningPlaces';
import type { MapPick } from '../StrategyEditor';
import { playerTag, type PlayerOption } from '../../../primitives/player';
import { nameOfPlayer, shortName } from '../../../players/names';
/**
 * What the blocks of one card get from the strategy editor. A card's blocks are a plain function called while the
 * editor renders, so their warnings are handed out before the editor shows what is left.
 */
export interface CardKit {
  t: TFunction;
  table: Table;
  /** The board just before the turn. */
  board: Board;
  pack: DataPack;
  /** The round of the turn, as the kernel keeps it: the cards held and the turns. */
  round: Round;
  /** The card turn being edited, and the old entry it stands for (what the checks of the cards still read). */
  turn: CardTurn;
  entry: CardEntry;
  /** Whose turn it is, and their faction. */
  player: PlayerId;
  faction: string;
  effects: CardEffects;
  primary: boolean;
  te: boolean;
  cost: { kind: 'resources' | 'influence'; amount: number };
  change: (patch: CardPatch) => void;
  setEffects: (patch: CardEffects) => void;
  placer: WarningPlacer;
  list: (shown: Warning[]) => ReactNode;
  tokenPick: (rearrange?: boolean, onTokens?: (tokens: CardEffects['tokens']) => void) => ReactNode;
  pickButton: (pick: MapPick, label: string, slot?: string) => ReactNode;
  tile: (slot: string) => string;
  builtLine: ReactNode;
  upgradeRow: ReactNode;
  /** The other players of the table as a player choice. */
  others: PlayerOption[];
  toggled: (list: string[] | undefined, id: string) => string[];
  onOpenShop: (slot: string, only: 'build' | 'units') => void;
  onStartTactical: () => void;
  onOpenTactical: (id: string) => void;
}

export type CardBlocks = (kit: CardKit) => ReactNode;

/** The other players of the table as a player choice: the short name, the colour, the tag for a crowded line; the value is the key the effects keep (`me` for the viewer). */
export const playersBeside = (table: Table, pack: DataPack, who: PlayerId, t: TFunction): PlayerOption[] => table.players.filter(p => p.id !== who).map(p => {
  const label = shortName(pack, p.faction, nameOfPlayer(table, pack, p.id, t));
  return { value: legacyKey(table, p.id), label, color: p.color, tag: playerTag(label, Boolean(pack.factions[p.faction]), p.seat) };
});
