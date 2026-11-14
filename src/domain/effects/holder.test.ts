import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { bench, endOf } from './components/kit';
import { defaultHolder, speaksIn } from './holder';
import { holderRuleOf } from './registry';
import { hintsAt } from '../../testing/old/domain/effects/registry';

describe('holder: on whose action a component speaks', () => {
  test('the card prints it: another player\'s action is `others`, anything else `self`', () => {
    const pack = loadPack(['pok', 'te']);
    expect(holderRuleOf(pack, 'actionCard:decoy')).toBe('others');
    expect(holderRuleOf(pack, 'technology:ers')).toBe('others');
    expect(holderRuleOf(pack, 'leader:cabalagent')).toBe('others');
    expect(holderRuleOf(pack, 'ability:harrow')).toBe('self');
    expect(holderRuleOf(pack, 'actionCard:sabotage')).toBe('self');
    expect(defaultHolder({ text: 'Once per combat, after your opponent rolls: you may reroll.' })).toBe('self');
    expect(defaultHolder({ text: 'After another player activates a system: you may do X.' })).toBe('others');
  });

  test('speaksIn: self in the holder\'s own action and where they take part, others in anyone else\'s, anyone in all', () => {
    expect(speaksIn('self', true, false)).toBe(true);
    expect(speaksIn('self', false, true)).toBe(true);
    expect(speaksIn('self', false, false)).toBe(false);
    expect(speaksIn('others', true, true)).toBe(false);
    expect(speaksIn('others', false, false)).toBe(true);
    expect(speaksIn('anyone', true, false)).toBe(true);
  });

  test('a reminder of "when another player ..." shows in that player\'s action, not in the holder\'s own', () => {
    const held = bench({ faction: 'sol', expansions: ['pok'], start: { hand: ['actionCard:decoy'] } });
    const board = endOf(held);
    expect(hintsAt(held.pack, board, 'activation', ['me']).map(c => c.id)).not.toContain('actionCard:decoy');
    expect(hintsAt(held.pack, board, 'activation', ['rival']).map(c => c.id)).toContain('actionCard:decoy');
  });

  test('a note of one\'s own is not offered as playable (LRR 69.2)', () => {
    const held = bench({ faction: 'sol', expansions: ['pok'], start: { promissory: ['promissory:stymie@me'] } });
    expect(hintsAt(held.pack, endOf(held), 'movement', ['rival']).map(c => c.id)).not.toContain('promissory:stymie@me');
  });
});
