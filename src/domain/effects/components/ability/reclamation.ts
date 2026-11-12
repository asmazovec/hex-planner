/**
 * Reclamation (Winnu, faction ability): "After you resolve a tactical action during which you gained control of
 * Mecatol Rex: You may place 1 PDS and 1 space dock from your reinforcements on Mecatol Rex."
 *
 * Decided: a `passive` waiver. A structure the landing puts on a planet (`landings[].structures`) that no flight
 * brought is reported by the replay as missing from the space area (`unitsMissing`, invasion step) and placed all the
 * same. Reclamation takes it from the reinforcements instead: the warning is lifted for at most 1 PDS and 1 space dock
 * on Mecatol Rex, and only when the action gained control of it. Ruling (Winnu, Reclamation 1): the structure is
 * placed after the Production step, so a dock placed does not produce in that action.
 *
 * Pass 1: the hint it is today; the tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:reclamation';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
