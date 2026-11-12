/**
 * Hecatoncheires (Titans of Ul, mech): "DEPLOY: When you would place a PDS on a planet, you may place 1 mech and 1
 * infantry on that planet instead."
 *
 * Decided: `passive` waiver. Construction's secondary places a structure and the replay warns of units it places
 * (`constructionUnits`); for the Titans one mech and one infantry instead of each PDS is what the card allows, so the
 * check is lifted when the units are mechs and infantry one for one, and nothing else. Pass 1: still a hint.
 */
import type { ComponentEffect } from '../../types';

export const id = 'mech:titans_mech';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
