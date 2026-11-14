/**
 * Acamar (Empyrean, agent):
 * After a player moves ships into a system that does not contain any planets: You may exhaust this card: that
 * player gains 1 command token.
 *
 * A play, red in pass 1: named in `uses` of a tactical action that moves ships into a system without planets, the
 * agent is exhausted (already) and the mover gains 1 command token (pass 2, with the pool chosen).
 * Decided (pass 2): the token goes to the pool in `choices.pool` (tactic by default). The condition is the active
 * system without planets and ships moved into it; the condition not met gains nothing (the warnings of the agent
 * itself, not held or exhausted, are the replay's). The token goes to the player whose entry names the agent: the
 * agent's owner, or the mover when the entry is another player's.
 */
import type { ComponentEffect } from '../../types';
import { tokens } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';

export const id = 'leader:empyreanagent';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{
    key: 'pool',
    kind: 'option',
    label: { ru: 'Пул жетона', en: 'Token pool' },
    options: () => ['tactic', 'fleet', 'strategy'],
    names: {
      tactic: { ru: 'Тактический', en: 'Tactic' },
      fleet: { ru: 'Резерв флота', en: 'Fleet' },
      strategy: { ru: 'Стратегический', en: 'Strategy' },
    },
  }],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const entry = ctx.entry;
    if (entry?.type !== 'tactical' || entry.systemId === null) return [];
    const moved = entry.moves.some(move => Object.values(move.units).some(count => (count ?? 0) > 0));
    if (!moved || ctx.planetsIn(entry.systemId).length > 0) return [];
    const pool = ctx.choices.pool;
    return [tokens(ctx.holder, { [pool === 'fleet' || pool === 'strategy' ? pool : 'tactic']: 1 }, 'component')];
  },
};
