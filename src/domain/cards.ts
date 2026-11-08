import type { ExpansionId } from './types';

export type StrategyCardSetId = 'te' | 'pok' | 'base_game';

export interface StrategyCard {
  initiative: number;
  name: string;
  changedIn?: 'te';
  summaryKey: string;
}

export function strategyCardSet(expansions: ExpansionId[]): StrategyCardSetId {
  if (expansions.includes('te')) return 'te';
  return expansions.includes('pok') ? 'pok' : 'base_game';
}
