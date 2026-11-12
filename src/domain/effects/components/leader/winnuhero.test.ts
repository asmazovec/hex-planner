import { describe, expect, test } from 'vitest';
import { CARD } from '../../../replay/cards/ids';
import type { Entry } from '../../../types';
import { bench, effect, endOf, expectStanding, expectWaived, primary, quote, using, warningsOf } from '../kit';
import { id } from './winnuhero';

/** The Winnu with the hero unlocked; `card` is the strategy card they hold this round, if any. */
function table(entries: Entry[], card: number | null = CARD.leadership) {
  const winnu = bench({ faction: 'winnu', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries });
  winnu.game.plans[0].rounds[0].strategyCard = card;
  return winnu;
}
/** Politics' primary performed through the hero. */
const imperialSeal = () => using(primary(CARD.politics), id);

describe('leader:winnuhero Mathis Mathinus — Imperial Seal', () => {
  // "ACTION: Perform the primary ability of any strategy card."
  // Checks: holding Leadership, the Winnu perform Politics' primary through the hero; the warning that the card is
  // not theirs is listed and lifted by the hero.
  // Why the check is redundant here: the primary belongs to the holder of the card (83.3), and the hero performs that
  // of any card.
  test('leader:winnuhero performs the primary of a card not held: foreignPrimary is waived', () => {
    const seal = imperialSeal();
    const winnu = table([seal]);
    quote(winnu.pack, id, 'Perform the primary ability of any strategy card');
    expectWaived(warningsOf(winnu, seal), 'foreignPrimary', id);
  });

  // Checks: the primary performed through the hero spends no strategy token; the pool stays at its 2.
  // Why the check is redundant here: a primary of a card not held costs a token only as a strategic action played
  // for a token; the hero's ACTION is a component action whose cost is the hero itself.
  test('leader:winnuhero the primary performed through it spends no strategy token', () => {
    expect(endOf(table([imperialSeal()])).strategy).toBe(2);
  });

  // Checks: with no card of the round chosen, the Winnu's Leadership primary is followed by Politics through the
  // hero; the warning of a second primary is listed and lifted by the hero.
  // Why the check is redundant here: the hero's primary is not one of the strategic actions the cards held allow (82.1).
  test('leader:winnuhero is not one more primary of the round: primaryRepeated is waived', () => {
    const seal = imperialSeal();
    expectWaived(warningsOf(table([primary(CARD.leadership), seal], null), seal), 'primaryRepeated', id);
  });

  // LRR 83.3: "the player who has the card ... resolves the primary ability of that card".
  // Checks: the same primary without the hero is warned of and costs a token.
  // Why the check is NOT redundant here: the hero is an ACTION and was not played.
  test('leader:winnuhero not used, the primary of a card not held stands and costs a token', () => {
    const politics = primary(CARD.politics);
    const winnu = table([politics]);
    expectStanding(warningsOf(winnu, politics), 'foreignPrimary');
    expect(endOf(winnu).strategy).toBe(1);
  });

  // "Then, purge this card." LRR 51.12.
  // Checks: the hero is purged by its use; using it again is warned of.
  test('leader:winnuhero is purged by its use', () => {
    const again = imperialSeal();
    expectStanding(warningsOf(table([imperialSeal(), again]), again), 'componentNotHeld');
  });

  test.todo('leader:winnuhero the other players chosen perform the secondary: the secondaries of opponents are not planned');

  test('leader:winnuhero is a play effect that waives the primary of a card not held', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).waive?.map(w => w.code).sort()).toEqual(['foreignPrimary', 'primaryRepeated']);
  });
});
