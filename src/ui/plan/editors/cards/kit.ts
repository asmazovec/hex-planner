import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import type { CardEntry, CardPatch } from '../../../../domain/strategy';
import type { CardEffects, DataPack, Game, GameState, Opponent, Round, Warning } from '../../../../domain/types';
import type { WarningPlacer } from '../../../feedback/warningPlaces';
import type { MapPick } from '../StrategyEditor';
import { playerTag, type PlayerOption } from '../../../primitives/player';
import { shortName } from '../../../players/names';

/**
 * What the blocks of one card get from the strategy editor. A card's blocks are a plain function called while the
 * editor renders, so their warnings are handed out before the editor shows what is left.
 */
export interface CardKit {
  t: TFunction;
  game: Game;
  pack: DataPack;
  round: Round;
  entry: CardEntry;
  /** The state just before the entry. */
  before: GameState;
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
  opponents: Opponent[];
  named: (id: string) => string;
  toggled: (list: string[] | undefined, id: string) => string[];
  onOpenShop: (slot: string, only: 'build' | 'units') => void;
  onStartTactical: () => void;
  onOpenTactical: (id: string) => void;
}

export type CardBlocks = (kit: CardKit) => ReactNode;

/** The opponents as a player choice: the short name, the colour, the tag for a crowded line. */
export const opponentOptions = ({ opponents, pack, named }: CardKit): PlayerOption[] => opponents.map(o => {
  const label = shortName(pack, o.faction, named(o.id));
  return { value: o.id, label, color: o.color, tag: playerTag(label, Boolean(pack.factions[o.faction]), o.seat) };
});
