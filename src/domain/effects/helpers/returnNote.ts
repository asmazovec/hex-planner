import { noteAddress, noteBase } from '../../components';
import { card } from '../../../game/abilities/emit';
import type { AbilityContext, GameEvent } from '../../../game/abilities/types';

/**
 * A note held by the holder goes back to its owner when the holder activates a system with that owner's units or
 * structures in it. Returns the events of each note returned, and `onReturn` adds what the note says about it.
 */
export function returnOnActivation(ctx: AbilityContext, base: string, onReturn: (owner: string) => GameEvent[] = () => []): GameEvent[] {
  const entry = ctx.entry;
  if (entry?.type !== 'tactical' || entry.systemId === null) return [];
  const slot = entry.systemId;
  const planets = ctx.planetsIn(slot);
  const events: GameEvent[] = [];
  for (const held of ctx.my.cards()) {
    const address = noteAddress(held.id);
    const owner = address === undefined ? undefined : ctx.playerOf(address);
    if (noteBase(held.id) !== base || owner === undefined || owner === ctx.holder) continue;
    const theirs = ctx.of(owner);
    const stands = Object.values(theirs.unitsIn(slot)).some(n => (n ?? 0) > 0) || planets.some(planet => Object.values(theirs.unitsOn(planet)).some(n => (n ?? 0) > 0))
      || theirs.structures().some(each => planets.includes(each.planet));
    if (!stands) continue;
    events.push(card.lose(ctx.holder, held.id), card.gain(owner, held.id), ...onReturn(owner));
  }
  return events;
}
