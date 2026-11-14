import { describe, expect, test } from 'vitest';
import { CARD } from '../../../strategy';
import type { CardEffects, Warning } from '../../../types';
import { bench, effect, endOf, expectNone, expectStanding, primary, quote, secondary, tactical, TARGET, warningsOf } from '../kit';
import { id } from './propagation';

/** Technology's primary researching one technology free, with `tokens` distributed. */
const research = (tokens: CardEffects['tokens'] = {}) => primary(CARD.technology, { researched: ['technology:st'], tokens });
const table = (faction: string, play = research({ tactic: 3 })) => ({ play, ...bench({ faction, entries: [play] }) });
const tokensOf = (warnings: Warning[]) => warnings.find(w => w.code === 'tokensOver')?.params;

describe('ability:propagation Propagation', () => {
  // "When you would research a technology: Gain 3 command tokens instead."
  // Checks: the Nekro player's primary of Technology researches one technology and distributes 3 tokens to the tactic
  // pool; no warning that more tokens were given than the card gives, and the tactic pool holds 6.
  // Why the check is redundant here: the card's tokens are checked against what it gives (none for Technology); the
  // ability turns the research into 3 command tokens, so the 3 given are what the card now gives (a `modify` of the
  // tokens the research gives, nothing waived).
  test('ability:propagation a research gives 3 command tokens instead: the tokens are not over', () => {
    const nekro = table('nekro');
    quote(nekro.pack, id, 'When you would research a technology: Gain 3 command tokens instead.');
    expectNone(warningsOf(nekro, nekro.play), 'tokensOver');
    expect(endOf(nekro).tactic).toBe(6);
  });

  // "You cannot research technology"
  // Checks: the technology entered as researched is not held after the entry.
  // Why the check is redundant here: the research is replaced by the tokens, so nothing joins the holdings.
  test('ability:propagation the technology researched is not gained', () => {
    const nekro = table('nekro');
    quote(nekro.pack, id, 'You cannot research technology');
    expect(endOf(nekro).holdings.technologies).not.toContain('technology:st');
  });

  // Ruling (Nekro Virus, Propagation 2): "The Nekro player may still resolve the primary or secondary abilities of the
  //  Technology strategy card, which will instead gain them command tokens."
  // Checks: the secondary researching one technology gives 3 tokens to the fleet pool without a warning.
  // Why the check is redundant here: the same replacement holds for the secondary.
  test('ability:propagation the secondary of Technology gives 3 command tokens too', () => {
    const play = secondary(CARD.technology, { researched: ['technology:st'], tokens: { fleet: 3 }, payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });
    const nekro = table('nekro', play);
    expectNone(warningsOf(nekro, play), 'tokensOver');
    expect(endOf(nekro).fleet).toBe(6);
  });

  // Checks: four tokens for one research are one beyond the three, and the warning names 3 as what the card gives.
  // Why the check is NOT redundant here: the ability gives exactly 3 tokens a research, no more.
  test('ability:propagation a fourth token for one research is over, against three', () => {
    const nekro = table('nekro', research({ tactic: 4 }));
    const warnings = warningsOf(nekro, nekro.play);
    expectStanding(warnings, 'tokensOver');
    expect(tokensOf(warnings)).toMatchObject({ given: 4, free: 3 });
  });

  // LRR 91.2, in short: the primary of Technology researches technologies; the card gives no command tokens.
  // Checks: another faction researching the same technology holds it, and the 3 tokens are warned of as given beyond 0.
  // Why the check is NOT redundant here: Propagation is the Nekro Virus's own ability.
  test('ability:propagation is the Nekro\'s own: another faction researches and gains no tokens', () => {
    const sol = table('sol');
    const warnings = warningsOf(sol, sol.play);
    expectStanding(warnings, 'tokensOver');
    expect(tokensOf(warnings)).toMatchObject({ given: 3, free: 0 });
    expect(endOf(sol).holdings.technologies).toContain('technology:st');
  });

  // Ruling (Nekro Virus, Propagation 1): "If the Nekro player resolves an ability that instructs them to "gain" a
  //  technology, instead of "research" that technology, they will get that technology instead of the command tokens."
  // Checks: a technology entered as a gain is held by the Nekro player.
  // Why the check is NOT redundant here: gaining is not researching; the ability does not touch it.
  test('ability:propagation a technology gained, not researched, is held', () => {
    const gain = tactical(TARGET, { gains: ['technology:st'] });
    expect(endOf(bench({ faction: 'nekro', entries: [gain] })).holdings.technologies).toContain('technology:st');
  });

  test('ability:propagation is a passive effect with no waiver', () => {
    const { pack } = table('nekro');
    expect(effect(pack, id).tier).toBe('passive');
  });
});
