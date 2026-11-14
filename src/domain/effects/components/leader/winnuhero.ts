/**
 * Mathis Mathinus, Imperial Seal (Winnu, hero): "ACTION: Perform the primary ability of any strategy card. Then,
 * choose any number of other players. Those players may perform the secondary ability of that strategy card. Then,
 * purge this card."
 *
 * Decided: `play` with waivers. The hero is named in `uses` of a strategic entry with the card it performs (the replay
 * purges it): the primary of a card the player does not hold is not warned of (`foreignPrimary`, 83.3), it is not
 * one more primary of the round (`primaryRepeated`), and it spends no strategy token. The other players' secondaries
 * are theirs (ruling 1: they still spend a token) and are not planned.
 */
import type { Ability } from '../../../../game/abilities/types';
import type { PermitContext } from '../../../../game/abilities/types';

export const id = 'leader:winnuhero';

const RULE = 'Perform the primary ability of any strategy card';
/** The hero is ready and the entry is a primary performed through it. */
const performed = (ctx: PermitContext): boolean => ctx.entry?.type === 'strategic' && ctx.had.card(id) === 'ready';

export const ability: Ability = {
  holder: 'self',
  tier: 'play',
  rule: id,
  // The hero's ACTION is the cost: the primary performed through it spends no strategy token.
  modify: { strategyCost: () => 0 },
  permit: [
    { code: 'foreignPrimary', rule: RULE, when: (_warning, ctx) => performed(ctx) },
    { code: 'primaryRepeated', rule: RULE, when: (_warning, ctx) => performed(ctx) },
  ],
};
