/**
 * Stellar Converter (relic): "ACTION: Choose 1 non-home, non-legendary planet other than Mecatol Rex in a system that
 * is adjacent to 1 or more of your units that have BOMBARDMENT, destroy all units on that planet and purge its
 * attachments and its planet card. Then, place the destroyed planet token on that planet and purge this card."
 *
 * Decided (pass 2): play. `choices.planetId` is destroyed: every unit on it is gone and nobody controls it any more; a
 * target the card does not allow (my own planet, a home or legendary planet, Mecatol Rex, no unit with BOMBARDMENT
 * adjacent) is warned of. The replay already purges the relic. Pass 1 keeps it the hint it is today.
 */
import converterTarget from '../../../rules/codes/converterTarget';
import { removeUnits } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import type { GameEvent } from '../../../../game/events';
import { violation } from '../../../rules/registry';

export const id = 'relic:stellarconverter';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'planetId', kind: 'planet' }],
  holder: 'self',
  play: ctx => {
    const planetId = String(ctx.choices.planetId ?? '');
    if (!ctx.held || !planetId) return [];
    const planet = ctx.pack.planets[planetId];
    const reason = ctx.board.planets[planetId]?.owner === ctx.holder ? 'mine'
      : ctx.tileKind(ctx.systemOf(planetId) ?? '') === 'home' ? 'home'
        : planet?.legendary !== undefined ? 'legendary'
          : planet?.name === 'Mecatol Rex' ? 'mecatol' : undefined;
    if (reason) ctx.warn(violation(converterTarget.code, { planetId, reason }));
    // Every unit and structure on the planet is destroyed, nobody controls it (the board keeps no event that takes an attachment off, so its attachments stay listed).
    const events: GameEvent[] = [];
    const here = ctx.board.planets[planetId];
    for (const [player, units] of Object.entries(here?.ground ?? {})) if (Object.values(units).some(n => (n ?? 0) > 0)) events.push(removeUnits(player, { planet: planetId }, units));
    if (here?.owner !== undefined) events.push({ type: 'PlanetLost', planet: planetId });
    return events;
  },
};
