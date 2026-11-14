import { describe, expect, test } from 'vitest';
import structureAboard from '../../../rules/codes/structureAboard';
import type { Entry, Game } from '../../../../testing/old/domain/types';
import { bench, effect, endOf, expectStanding, expectWaived, FAR, FARTHER, HOME, NEAR, quote, TARGET, tactical, using, warningsOf } from '../kit';
import { id } from './nanolink';

const CODE = structureAboard.code;
/** The note as the Ral Nel player o1 gave it: a card of its owner, under its address. */
const NOTE = `${id}@o1`;
const RALNEL = { id: 'o1', faction: 'ralnel', vp: 0, seat: 2, color: 2 };

/** The target tile stands next to home: home 0,0 (h1, h2), target 1,0 (t1, t2). */
const NEXT_DOOR: Record<string, string> = { [HOME]: 'r-home', [NEAR]: 'r-target', [TARGET]: 'r-empty', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };

/** I activate the system of t1 and move the PDS of h1 next door onto t1, which I control. */
const permit = (systemId = NEAR, extra: Partial<Extract<Entry, { type: 'tactical' }>> = {}) => tactical(systemId, {
  moves: [{ from: 'h1', units: {}, structures: { pds: 1 } }],
  landings: [{ planetId: 't1', units: {}, structures: { pds: 1 } }],
  ...extra,
});

const table = (faction: string, entries: Entry[], options: { map?: Record<string, string>; notes?: string[] } = {}) => bench({
  faction, expansions: ['te'], entries, start: { promissory: options.notes ?? [NOTE] },
  game: { opponents: [RALNEL], map: { ...(options.map ?? NEXT_DOOR) }, pds: { h1: 1 }, planetControl: { h1: 'me', t1: 'me' } } as Partial<Game>,
});

describe('promissory:nanolink Nano-Link Permit', () => {
  // "After you activate a system: You may move your structures from adjacent systems that do not contain your command
  //  tokens onto planets you control in the active system."
  // Checks: the holder names the note in the tactical action; the PDS of h1 (home, adjacent, no command token there)
  // is moved onto t1 of the active system, and the warning that structures do not move is listed and lifted by the note.
  // Why the check is redundant here: LRR 85.3 says "Structures cannot move or be transported"; the note moves them
  // directly (Nano-Link Permit note 2), within its own limits: an adjacent system without the holder's tokens.
  test('promissory:nanolink moves a structure from an adjacent system onto a planet of the active system: the warning is waived', () => {
    const move = using(permit(), NOTE);
    const sol = table('sol', [move]);
    quote(sol.pack, id, 'You may move your structures from adjacent systems that do not contain your command tokens');
    expectWaived(warningsOf(sol, move), CODE, NOTE);
  });

  // Checks: what the note moved stands where it was put: the PDS leaves h1 for t1, nothing stays in a space area.
  // Why the check is redundant here: the effect of the move is the replay's own; only its warning is lifted.
  test('promissory:nanolink the structure moved stands on the planet of the active system', () => {
    const move = using(permit(), NOTE);
    const sol = table('sol', [move]);
    quote(sol.pack, id, 'onto planets you control in the active system');
    const end = endOf(sol);
    expect(end.pds.h1 ?? 0).toBe(0);
    expect(end.pds.t1).toBe(1);
    expect(end.afloat?.[NEAR]).toBeUndefined();
  });

  // LRR 85.3: "Structures cannot move or be transported."
  // Checks: the same move without naming the note is warned of.
  // Why the check is NOT redundant here: the note held but not played lifts nothing; it is an "After you activate a
  // system" window the player must take.
  test('promissory:nanolink held but not named in the action leaves the warning standing', () => {
    const move = permit();
    expectStanding(warningsOf(table('sol', [move]), move), CODE);
  });

  // "... from adjacent systems ..."
  // Checks: with the target tile two systems away from home, the PDS of h1 is not in an adjacent system.
  // Why the check is NOT redundant here: the note reaches adjacent systems only.
  test('promissory:nanolink a structure from a system that is not adjacent is still warned of', () => {
    const move = using(permit(TARGET), NOTE);
    const sol = table('sol', [move], { map: { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' } });
    expectStanding(warningsOf(sol, move), CODE);
  });

  // "... that do not contain your command tokens ..."
  // Checks: an earlier tactical action in my home system left my command token there; the PDS of h1 then stays put
  // by the rules, and moving it is warned of.
  // Why the check is NOT redundant here: the note excludes systems holding the holder's command tokens.
  test('promissory:nanolink a structure from a system with my command token is still warned of', () => {
    const earlier = tactical(HOME);
    const move = using(permit(), NOTE);
    expectStanding(warningsOf(table('sol', [earlier, move]), move), CODE);
  });

  // "... onto planets you control in the active system."
  // Checks: the PDS put on t2, which nobody of mine controls, is warned of.
  // Why the check is NOT redundant here: the note places only on planets the holder controls.
  test('promissory:nanolink a structure put on a planet I do not control is warned of', () => {
    const move = using(permit(NEAR, { landings: [{ planetId: 't2', units: {}, structures: { pds: 1 } }] }), NOTE);
    expectStanding(warningsOf(table('sol', [move]), move), 'structureNotControlled');
  });

  // "Then, return this card to the Ral Nel player." LRR 69.3.
  // Checks: once played the note leaves the holder's hand for its owner's.
  test('promissory:nanolink goes back to the Ral Nel player once played', () => {
    const move = using(permit(), NOTE);
    const end = endOf(table('sol', [move]));
    expect(end.holdings.promissory).not.toContain(NOTE);
    expect(end.rivals?.o1?.holdings.promissory).toContain(NOTE);
  });

  // LRR 69.2: a player cannot play their own promissory note.
  // Checks: the Ral Nel player naming their own note is warned of, and the note lifts nothing for them (the move of a
  // structure is then checked as everyone's; Miniaturization does not move structures between systems without a ship).
  // Why the check is NOT redundant here: the note is the Ral Nel's gift to others.
  test('promissory:nanolink the Ral Nel player cannot play their own note', () => {
    const own = `${id}@me`;
    const move = using(permit(), own);
    const ralnel = table('ralnel', [move], { notes: [own] });
    expectStanding(warningsOf(ralnel, move), 'ownPromissory');
  });

  test('promissory:nanolink is a play effect that waives the moving of structures for its entry only', () => {
    const { pack } = table('sol', []);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).permit?.map(w => [w.code, w.lasts])).toEqual([[CODE, undefined]]);
  });
});
