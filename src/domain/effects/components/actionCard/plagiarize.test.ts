import { describe, expect, test } from 'vitest';
import { componentById } from '../../../components';
import type { AnyWarningCode, Entry, Payment, UnitCounts } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, FARTHER, NEAR, quote, warningsOf } from '../kit';
import { id } from './plagiarize';

/** Codes pass 2 adds in src/domain/rules/codes/ (see the effect file); named here as they will be. */
const NOT_FROM_NEIGHBOR = 'techNotFromNeighbor' as AnyWarningCode;
const FACTION_TECH = 'factionTechCopied' as AnyWarningCode;

/** Home Two (influence 2) and Target Two (influence 3, controlled): five influence. */
const FIVE: Payment = { planets: ['h2', 't2'], tradeGoods: 0 };
type ComponentEntry = Extract<Entry, { type: 'component' }>;
const play = (technology: string, payment: Payment = FIVE) =>
  ({ ...(componentAction(id) as ComponentEntry), choices: { technology, from: 'o1' }, payment } as Entry);

/** An opponent of `faction` holding `technologies`, with a destroyer at `where` (the near system makes them my neighbour). */
const table = (entry: Entry, technologies: string[], where: string = NEAR, faction = 'hacan') => bench({
  faction: 'sol', expansions: ['pok'], entries: [entry],
  game: {
    start: { me: { hand: [id] }, opponents: { o1: { technologies } } },
    opponents: [{ id: 'o1', faction, vp: 0, seat: 2, color: 2 }],
    enemyUnits: { [where]: { o1: { destroyer: 1 } as UnitCounts } },
    planetControl: { t2: 'me' },
  },
});

describe('actionCard:plagiarize Plagiarize', () => {
  // "Spend 5 influence and choose a non-faction technology owned by 1 of your neighbors. Gain that technology."
  // Checks: Gravity Drive, owned by a neighbour, is chosen and paid for with 5 influence; it is mine at the end, with
  // no shortfall, though I lack its prerequisite (Antimass Deflectors).
  // Why the prerequisites are not asked here: the card gains the technology, it does not research it (ruling 2:
  // "A player does not need to meet the prerequisites of the technology they gain from Plagiarize").
  test('actionCard:plagiarize gains the chosen technology of a neighbour for 5 influence', () => {
    const entry = play('technology:gd');
    const sol = table(entry, ['technology:gd']);
    quote(sol.pack, id, 'Spend 5 influence and choose a non-faction technology owned by 1 of your neighbors.');
    expectNone(warningsOf(sol, entry), 'shortInfluence');
    expectNone(warningsOf(sol, entry), NOT_FROM_NEIGHBOR);
    expectNone(warningsOf(sol, entry), FACTION_TECH);
    expect(endOf(sol).holdings.technologies).toContain('technology:gd');
    expect(endOf(sol).exhausted).toEqual(expect.arrayContaining(['h2', 't2']));
  });

  // Ruling 1: "A player cannot play Plagiarize if they have less than five influence available."
  // Checks: paid with Home One and Home Two (3 influence), the action is two short.
  // Why the check is NOT redundant here: the card costs 5 influence; nothing lifts it.
  test('actionCard:plagiarize paid with 3 influence is two short', () => {
    const entry = play('technology:gd', { planets: ['h1', 'h2'], tradeGoods: 0 });
    const sol = table(entry, ['technology:gd']);
    expectStanding(warningsOf(sol, entry), 'shortInfluence');
    expect(warningsOf(sol, entry).find(w => w.code === 'shortInfluence')?.params).toMatchObject({ needed: 5, paid: 3 });
  });

  // "... owned by 1 of your neighbors."
  // Checks: the opponent stands at the far end of the row, not next to any system of mine: the choice is warned of.
  // Why the check is NOT redundant here: the card reaches only a neighbour's technologies (LRR 60.1).
  test('actionCard:plagiarize from a player who is not a neighbour is warned of', () => {
    const entry = play('technology:gd');
    expectStanding(warningsOf(table(entry, ['technology:gd'], FARTHER), entry), NOT_FROM_NEIGHBOR);
  });

  // "... a non-faction technology owned by 1 of your neighbors."
  // Checks: the neighbour does not own the technology chosen: the choice is warned of.
  // Why the check is NOT redundant here: only what the neighbour owns can be gained.
  test('actionCard:plagiarize a technology the neighbour does not own is warned of', () => {
    const entry = play('technology:gd');
    expectStanding(warningsOf(table(entry, ['technology:nm']), entry), NOT_FROM_NEIGHBOR);
  });

  // "... choose a non-faction technology ..."
  // Checks: a Sol neighbour owns Advanced Carrier II, a Sol faction technology; choosing it is warned of.
  // Why the check is NOT redundant here: the card excludes faction technologies.
  test('actionCard:plagiarize a faction technology is warned of', () => {
    const entry = play('technology:ac2');
    const sol = table(entry, ['technology:ac2'], NEAR, 'sol');
    expect(componentById(sol.pack, 'technology:ac2')?.faction).toBe('sol');
    expectStanding(warningsOf(sol, entry), FACTION_TECH);
  });

  // Checks: without the card nothing is gained: a component action with no component leaves the technologies alone.
  // Why nothing changes here: a technology joins the holdings only by research, a gain or a card that gives it.
  test('actionCard:plagiarize not played, no technology is gained', () => {
    const entry = { ...componentAction(id, {}), componentId: undefined, choices: { technology: 'technology:gd' } } as Entry;
    expect(endOf(table(entry, ['technology:gd'])).holdings.technologies).not.toContain('technology:gd');
  });

  test('actionCard:plagiarize is a play effect that lifts no check', () => {
    const { pack } = table(play('technology:gd'), []);
    expect(effect(pack, id).tier).toBe('play');
  });
});
