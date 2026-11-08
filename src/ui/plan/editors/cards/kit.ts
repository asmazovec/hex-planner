import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import type { CardEntry, CardPatch } from '../../../../domain/strategy';
import type { CardEffects, DataPack, Game, GameState, Opponent, Round, Warning } from '../../../../domain/types';
import type { WarningPlacer } from '../../../feedback/warningPlaces';
import type { MapPick } from '../StrategyEditor';

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
