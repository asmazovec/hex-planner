import { describe, expect, test } from 'vitest';
import { tech } from '../../../rules/kit';
import type { Entry, Holdings, StartHoldings } from '../../../types';
import { adjust, before, bench, componentAction, effect, endOf, expectNone, expectStanding, quote, warningsOf, type Bench } from '../kit';
import { id } from './ed1';

const CRUISER_II = tech('cruiser');
/** The card explored from a frontier token: drawn from the deck, so in the gains of an entry. */
const found = (): Entry => ({ ...adjust({}), gains: [id] });
/**
 * The wanted shape (pass 2): the ACTION of the card, the technology chosen in `choices.technology` and the resources
 * paid in a `payment` of the component action (Home One 3, Home Two 1, Target One 2).
 */
const research = (planets: string[], technology = CRUISER_II): Entry =>
  ({ ...componentAction(id, { choices: { technology } } as Partial<Entry>), payment: { planets, tradeGoods: 0 } } as Entry);
const SIX = ['h1', 'h2', 't1'];
const table = (entries: Entry[], start: StartHoldings = {}): Bench =>
  bench({ faction: 'letnev', expansions: ['pok'], entries, start, game: { planetControl: { t1: 'me' } } });
const copies = (holdings: Holdings, card: string): number =>
  Object.values(holdings).flatMap(list => (Array.isArray(list) ? list : [])).filter(held => held === card).length;

describe('exploration:ed1 Enigmatic Device', () => {
  // "Place this card faceup in your play area. ACTION: You may spend 6 resource and purge this card to research 1
  //  technology."
  // Checks: the device found is held; its action, paid with six resources, researches Cruiser II and purges the card.
  // Why the check is redundant here: nothing is lifted; research is otherwise the Technology card's (90.9), and the
  // card names its own way, so the plan researches the technology chosen.
  test('exploration:ed1 found and played for six resources researches a technology and is purged', () => {
    const action = research(SIX);
    const device = table([found(), action]);
    quote(device.pack, id, 'ACTION: You may spend 6 resource and purge this card to research 1 technology.');
    expect(copies(before(device.game, device.pack, action).holdings, id)).toBe(1);
    expect(endOf(device).holdings.technologies).toContain(CRUISER_II);
    expect(copies(endOf(device).holdings, id)).toBe(0);
  });

  // Checks: held and paid in full, the action is warned of nothing about the card.
  // Why the check is redundant here: the card is held and ready.
  test('exploration:ed1 found and played is not warned of as a component not held', () => {
    const action = research(SIX);
    expectNone(warningsOf(table([found(), action]), action), 'componentNotHeld');
  });

  // "You may spend 6 resource" — note: a player cannot play the card with fewer than six resources available.
  // Checks: paid with four resources the action is warned of.
  // Why the check is NOT redundant here: the card names six.
  test('exploration:ed1 paid with four resources is warned of', () => {
    const action = research(['h1', 'h2']);
    expectStanding(warningsOf(table([found(), action]), action), 'shortResources');
  });

  // LRR 22: a component action is played with a component the player has.
  // Checks: the action without the card found is warned of.
  // Why the check is NOT redundant here: the card was never placed in the play area.
  test('exploration:ed1 played without being found is warned of as not held', () => {
    const action = research(SIX);
    expectStanding(warningsOf(table([action]), action), 'componentNotHeld');
  });

  // "... and purge this card"
  // Checks: a second action after the first is warned of: the card is gone.
  // Why the check is NOT redundant here: a purged card is out of the game.
  test('exploration:ed1 played a second time is warned of as not held', () => {
    const again = research(SIX);
    expectStanding(warningsOf(table([found(), research(SIX), again]), again), 'componentNotHeld');
  });

  // LRR 90.10: a technology already owned cannot be researched again.
  // Checks: the device researching Cruiser II, already owned, is warned of.
  // Why the check is NOT redundant here: the card researches as the Technology card does.
  test('exploration:ed1 researching a technology already owned is warned of', () => {
    const action = research(SIX);
    expectStanding(warningsOf(table([found(), action], { technologies: [CRUISER_II] }), action), 'researchOwned');
  });

  test('exploration:ed1 is a played effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
