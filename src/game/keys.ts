/** How the old model names players and what it makes of a player's cards; pure, and shared by the native registry. */

import { emptyHoldings } from '../domain/holdings';
import type { Holdings } from '../domain/types';
import type { CardHold, ComponentId, PlayerId, Table } from './types';

/** The id the old model gives a player: `me` for the viewer, the opponent's own id for the rest. */
export const legacyKey = (table: Table, player: PlayerId): string =>
  player === table.viewer ? 'me' : table.players.find(p => p.id === player)?.legacyId ?? player;

export const playerOfKey = (table: Table, key: string): PlayerId | undefined =>
  key === 'me' ? table.viewer : table.players.find(p => (p.legacyId ?? p.id) === key)?.id;

export const kindOf = (id: ComponentId): string => id.slice(0, id.indexOf(':'));

/** What a player's cards are as the old `Holdings`. */
export function holdingsOfCards(cards: Record<ComponentId, CardHold>): Holdings {
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

