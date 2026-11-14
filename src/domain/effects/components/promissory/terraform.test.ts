import { describe, expect, test } from 'vitest';
import { CARD } from '../../../replay/cards/ids';
import type { Entry, Game } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, HOME, primary, quote, tactical, warningsOf } from '../kit';
import attachTarget from '../../../rules/codes/attachTarget';
import { id } from './terraform';

const NOTE = `${id}@o1`;
const TITANS: Game['opponents'][number] = { id: 'o1', faction: 'titans', vp: 0, seat: 2, color: 2 };

/** Terraform played on `planetId` by a component action. */
const terraform = (planetId: string, note = NOTE): Entry => componentAction(note, { choices: { planetId } } as Partial<Entry>);
/** A cruiser and a destroyer (3 resources) built at home, paid with `planets`. */
const build = (...planets: string[]): Entry => tactical(HOME, { production: { cruiser: 1, destroyer: 1 }, payment: { planets, tradeGoods: 0 } });

/** Sol, holding the Titans' Terraform, controls t1 besides the home planets; the dock is on h1. */
const table = (entries: Entry[], faction = 'sol', note = NOTE) =>
  bench({ faction, expansions: ['pok'], start: { promissory: [note] }, entries, game: { opponents: [TITANS], planetControl: { t1: 'me' }, docks: ['h1'] } });

const codes = (warnings: { code: string }[]): string[] => warnings.map(w => w.code);

describe('promissory:terraform Terraform', () => {
  // "ACTION: Attach this card to a non-home planet you control other than Mecatol Rex. Its resource and influence
  //  values are each increased by 1"
  // Checks: Terraform is played on t1 (2 resources); a production of 3 paid with t1 alone is paid in full, and the
  // card is attached to t1.
  // Why the check is redundant here: the payment counts a planet's printed resources (LRR 75), and the attached card
  // adds 1 to them; without it t1 pays 2 and the production is short.
  test('promissory:terraform attached to a planet raises its resources by 1', () => {
    const pay = build('t1');
    const game = table([terraform('t1'), pay]);
    quote(game.pack, id, 'Its resource and influence values are each increased by 1');
    expectNone(warningsOf(game, pay), 'shortResources');
    expect(endOf(game).attachments?.t1).toContain(NOTE);
  });

  // Checks: the influence of t1 (1) is raised to 2: Leadership's token bought for 3 influence is paid with t1 and h1.
  // Why the check is redundant here: the same card raises the influence value as well.
  test('promissory:terraform attached to a planet raises its influence by 1', () => {
    const lead = primary(CARD.leadership, { boughtTokens: 1, payment: { planets: ['t1', 'h1'], tradeGoods: 0 } });
    const game = table([terraform('t1'), lead]);
    expectNone(warningsOf(game, lead), 'shortInfluence');
  });

  // LRR 75 (resources): a planet's resource value is the number printed on its card.
  // Checks: without Terraform the same payment is short.
  // Why the check is NOT redundant here: the note was not played.
  test('promissory:terraform not played, the planet pays its printed value', () => {
    const pay = build('t1');
    expectStanding(warningsOf(table([pay]), pay), 'shortResources');
  });

  // "... a non-home planet you control other than Mecatol Rex."
  // Checks: Terraform played on the home planet h1 is warned of, and h1 is not raised.
  // Why the check is NOT redundant here: the card excludes home planets; the play is entered all the same, since a
  // warning forbids nothing, but the bonus is not given.
  test('promissory:terraform on a home planet is warned of and gives nothing', () => {
    const play = terraform('h1');
    const pay = tactical(HOME, { production: { cruiser: 2 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const game = table([play, pay]);
    expect(codes(warningsOf(game, play))).toContain(attachTarget.code);
    expectStanding(warningsOf(game, pay), 'shortResources');
  });

  // "... a non-home planet you control ..."
  // Checks: Terraform played on t2, which Sol does not control, is warned of.
  // Why the check is NOT redundant here: the planet must be the player's own.
  test('promissory:terraform on a planet the player does not control is warned of', () => {
    const play = terraform('t2');
    expectStanding(warningsOf(table([play]), play), attachTarget.code);
  });

  // LRR 69.2: a player cannot play their own promissory note.
  // Checks: the Titans playing their own Terraform are warned of.
  // Why the check is NOT redundant here: Terraform is given to another player to be played.
  test('promissory:terraform the Titans cannot play their own', () => {
    const play = terraform('t1', `${id}@me`);
    expectStanding(warningsOf(table([play], 'titans', `${id}@me`), play), 'ownPromissory');
  });

  test.todo('promissory:terraform on Mecatol Rex is warned of: the test board has no Mecatol Rex');
  test.todo('promissory:terraform gives the planet all three traits: exploration is not modelled');

  test('promissory:terraform is played', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('passive'); // the base stacks the value of an attached card from passive effects only
    expect(effect(pack, id).nativePlay).toBeDefined();
  });
});
