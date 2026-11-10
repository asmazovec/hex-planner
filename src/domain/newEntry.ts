/** The bodies of new entries, by the kind of action, and whose they are: the screen only asks for one. */
import { plannedCard } from './strategy';
import type { EntryBody, Round } from './types';

export type NewAction = 'tactical' | 'strategic' | 'component' | 'pass' | 'adjustment';

const EMPTY_PAYMENT = { planets: [], tradeGoods: 0 };

/** A new tactical action on a system; one a card gives (Warfare) costs no token. */
export function tacticalBody(systemId: string, fromCard?: string): EntryBody {
  return {
    type: 'tactical', systemId, moves: [], landings: [], production: {}, payment: EMPTY_PAYMENT,
    ...(fromCard ? { free: true, fromCard } : {}),
  };
}

/**
 * A new entry of any other kind. A strategic action of mine starts on the card I hold and have not played this round; an
 * opponent's cards are not planned, so theirs starts on none.
 */
export function newEntryBody(type: Exclude<NewAction, 'tactical'>, round: Round, playerCount: number, owner?: string): EntryBody {
  switch (type) {
    case 'strategic': {
      const card = owner ? undefined : plannedCard(round, playerCount);
      return card === undefined ? { type } : { type, card };
    }
    case 'component':
      return { type: 'component', note: '' };
    case 'pass':
      return { type: 'pass' };
    case 'adjustment':
      return { type: 'adjustment', label: '', delta: {} };
  }
}

/** Whose a new tactical action is: the owner of the card that gives it, or else the player it is being added for. */
export const tacticalOwner = (round: Round, fromCard: string | undefined, actor: string | undefined): string | undefined =>
  (fromCard ? round.entries.find(e => e.id === fromCard)?.owner : actor);
