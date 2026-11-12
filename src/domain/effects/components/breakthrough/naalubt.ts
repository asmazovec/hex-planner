/**
 * Mindsieve (Naalu Collective, breakthrough, Thunder's Edge): "When you would resolve the secondary ability of another
 * player's strategy card, you may give them a promissory note to resolve it without spending a command token."
 *
 * To be a `play` effect, named in the `uses` of a secondary: the strategy token the secondary spends (20.5) is not
 * spent, and the warning that the strategy pool is empty (`shortStrategy`) is lifted for that entry. A primary, or a
 * secondary that costs nothing anyway (Leadership), gains nothing by it. The note given is not a transaction (Naalu,
 * Mindsieve note 2) and is not counted yet.
 *
 * Pass 1: still the hint it is today; the tests beside it say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:naalubt';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
