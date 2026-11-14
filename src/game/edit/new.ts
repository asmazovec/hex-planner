/** The bodies of new turns by the kind of action, and whose they are: the screen only asks for one. */
import type { Action, Payment, Turn } from '../actions';
import type { Round } from '../round';
import type { PlayerId, Slot } from '../types';

export type NewAction = 'tactical' | 'strategic' | 'component' | 'pass' | 'adjustment';

/** Where a new turn is added: its id, whose it is, the player whose eyes the plan is seen through, and the round it goes into. */
export interface NewTurnAt { id: string; player: PlayerId; viewer: PlayerId; round: Round; phase?: Turn['phase'] }

/** A strategic card is a primary for a token when it is not one of the round's cards; with no card of the round chosen, the flag says. */
const forTokenOf = (card: number | undefined, flag: boolean | undefined, held: number[]): boolean =>
  (held.length > 0 ? card !== undefined && !held.includes(card) : flag === true);

/** The planned card a new strategic action starts with: the first of the viewer's cards not played yet in the round. */
export function plannedCard(round: Round, viewer: PlayerId): number | undefined {
  const played = round.turns
    .filter(t => t.player === viewer && t.action.kind === 'strategic' && t.status !== 'cancelled'
      && !forTokenOf(t.action.card, t.action.forToken, round.held))
    .map(t => (t.action.kind === 'strategic' ? t.action.card : undefined));
  return round.held.find(card => !played.includes(card));
}

const empty = (): Payment => ({ planets: [], tradeGoods: 0 });

/** A new tactical action on a system; one a card gives (Warfare) costs no token. */
export function newTactical(system: Slot, fromCard?: string): Action {
  return {
    kind: 'tactical', system, movement: [], invasion: [], production: { units: {}, payment: empty() },
    ...(fromCard ? { free: true } : {}),
  };
}

/** Whose a new tactical action is: the owner of the card that gives it, or else the player it is being added for. */
export const tacticalOwner = (round: Round, fromCard: string | undefined, actor: PlayerId): PlayerId =>
  (fromCard ? round.turns.find(t => t.id === fromCard)?.player : undefined) ?? actor;

/**
 * A new turn of any kind. A strategic action of the viewer starts on the card they hold and have not played this round;
 * a rival's cards are not planned, so theirs starts on none.
 */
export function newTurn(kind: NewAction, at: NewTurnAt, options: { system?: Slot; fromCard?: string } = {}): Turn {
  const mine = at.player === at.viewer;
  const player = kind === 'tactical' ? tacticalOwner(at.round, options.fromCard, at.player) : at.player;
  let action: Action;
  switch (kind) {
    case 'tactical': action = newTactical(options.system ?? '', options.fromCard); break;
    case 'strategic': {
      const card = mine ? plannedCard(at.round, at.viewer) : undefined;
      action = card === undefined ? { kind: 'strategic' } : { kind: 'strategic', card };
      break;
    }
    case 'component': action = { kind: 'component', note: '' }; break;
    case 'pass': action = { kind: 'pass' }; break;
    case 'adjustment': action = at.phase === 'agenda' ? { kind: 'agenda', label: '', delta: {} } : { kind: 'correction', label: '', delta: {} }; break;
  }
  return { id: at.id, player, status: 'planned', ...(at.phase ? { phase: at.phase } : {}), action, acts: [], used: [] };
}
