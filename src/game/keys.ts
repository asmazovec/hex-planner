/** What a player's cards are in the shape the lists of the domain read; pure, and shared by the registry of abilities. */

import { emptyHoldings } from '../domain/holdings';
import type { CardHold, ComponentId } from './types';

export const kindOf = (id: ComponentId): string => id.slice(0, id.indexOf(':'));

/** The shape the domain's readers take of a player's cards: what a player's cards are in it. */
export type Shelf = ReturnType<typeof emptyHoldings>;

/** What a player's cards are in the domain's shelf shape. */
export function holdingsOfCards(cards: Record<ComponentId, CardHold>): Shelf {
  const h = emptyHoldings();
  for (const [id, hold] of Object.entries(cards)) {
    const exhausted = hold.state === 'exhausted';
    switch (kindOf(id)) {
      case 'technology': h.technologies.push(id); break;
      case 'actionCard': for (let i = 0; i < hold.count; i += 1) h.hand.push(id); break;
      case 'relic': h.relics.push(id); break;
      case 'promissory': h.promissory.push(id); if (hold.state === 'inPlay') (h.inPlay ??= []).push(id); break;
      case 'secretObjective': (hold.state === 'inPlay' ? h.scored : h.secrets).push(id); break;
      case 'publicObjective': h.scored.push(id); break;
      case 'exploration': for (let i = 0; i < hold.count; i += 1) h.found.push(id); break;
      case 'leader':
        if (hold.state !== 'locked') h.leaders[id] = hold.state === 'exhausted' ? 'exhausted' : hold.state === 'purged' ? 'purged' : 'unlocked';
        break;
      case 'breakthrough': h.breakthrough = exhausted ? 'exhausted' : 'held'; break;
      default: break;
    }
    if (exhausted && kindOf(id) !== 'leader' && kindOf(id) !== 'breakthrough') h.exhausted.push(id);
  }
  return h;
}

