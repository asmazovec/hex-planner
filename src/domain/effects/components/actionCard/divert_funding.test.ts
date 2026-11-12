import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, quote, warningsOf } from '../kit';
import { id } from './divert_funding';

/** A code pass 2 adds in src/domain/rules/codes/ (see the effect file); named here as it will be. */
const RETURNED_INVALID = 'returnedTechInvalid' as AnyWarningCode;

/** I own Antimass Deflectors, Neural Motivator and Destroyer II (a unit upgrade). */
const OWNED = ['technology:amd', 'technology:nm', 'technology:dd2'];
const play = (returned: string, researched: string) => ({ ...componentAction(id, {}), choices: { returned, researched } } as Entry);
const table = (entry: Entry) => bench({ faction: 'sol', expansions: ['pok'], start: { hand: [id], technologies: OWNED }, entries: [entry] });

describe('actionCard:divert_funding Divert Funding', () => {
  // "Return a non-unit upgrade, non-faction technology that you own to your technology deck. Then, research another
  //  technology."
  // Checks: Neural Motivator is returned and Gravity Drive researched; at the end I own Gravity Drive and no longer
  // Neural Motivator, with no warning about either.
  // Why it is counted: the holdings are what the plan replays; the card trades one technology for another.
  test.fails('actionCard:divert_funding returns one technology and researches another', () => {
    const entry = play('technology:nm', 'technology:gd');
    const sol = table(entry);
    quote(sol.pack, id, 'Return a non-unit upgrade, non-faction technology that you own to your technology deck.');
    const technologies = endOf(sol).holdings.technologies;
    expect(technologies).toContain('technology:gd');
    expect(technologies).not.toContain('technology:nm');
    expectNone(warningsOf(sol, entry), RETURNED_INVALID);
    expectNone(warningsOf(sol, entry), 'researchOwned');
  });

  // "Return a non-unit upgrade ... technology"
  // Checks: returning Destroyer II, a unit upgrade, is warned of.
  // Why the check is NOT redundant here: the card names the technologies it may return; a unit upgrade is not one.
  test.fails('actionCard:divert_funding returning a unit upgrade is warned of', () => {
    const entry = play('technology:dd2', 'technology:gd');
    expectStanding(warningsOf(table(entry), entry), RETURNED_INVALID);
  });

  // Ruling 1: "A player must have at least one non-unit upgrade, non-faction technology to play and resolve Divert
  //  Funding."
  // Checks: returning a technology I do not own is warned of.
  // Why the check is NOT redundant here: only a technology "that you own" can be returned.
  test.fails('actionCard:divert_funding returning a technology not owned is warned of', () => {
    const entry = play('technology:st', 'technology:gd');
    expectStanding(warningsOf(table(entry), entry), RETURNED_INVALID);
  });

  // Ruling 4: "The researched technology cannot be the returned technology." LRR 90.10: a technology is researched
  // from the player's own deck, so one already owned cannot be.
  // Checks: researching Antimass Deflectors, which I keep, is warned of as owned.
  // Why the check is NOT redundant here: the card researches "another technology", by the usual rule of research.
  test.fails('actionCard:divert_funding researching a technology already owned is warned of', () => {
    const entry = play('technology:nm', 'technology:amd');
    expectStanding(warningsOf(table(entry), entry), 'researchOwned');
  });

  // Checks: the card only held, a component action without it, leaves the technologies as they were.
  // Why nothing changes here: no card was played.
  test('actionCard:divert_funding not played, the technologies stay', () => {
    const entry = { ...componentAction(id, {}), componentId: undefined } as Entry;
    expect(endOf(table(entry)).holdings.technologies).toEqual(expect.arrayContaining(OWNED));
  });

  test.todo('actionCard:divert_funding the research must meet its prerequisites without the returned technology (ruling 2): the replay checks no prerequisites for any research yet');

  test.fails('actionCard:divert_funding is a play effect that lifts no check', () => {
    const { pack } = table(play('technology:nm', 'technology:gd'));
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
