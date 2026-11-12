/**
 * Nekro Malleon (Nekro Virus, agent): "During the action phase: You may exhaust this card to choose a player: that
 * player may discard 1 action card or spend 1 command token from their command sheet to gain 2 trade goods."
 *
 * To be a `play` effect, entered as a component entry with its choices: `player` (`me` or an opponent id), `pay`
 * (`token` or `actionCard`) and, for a token, `pool` (`tactic`, `fleet`, `strategy`). The chosen player spends the token
 * (or discards the card, entered in `spends`) and gains 2 trade goods. The agent is exhausted as every agent is.
 *
 * Pass 1: still the hint it is today; the tests beside it say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:nekroagent';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
