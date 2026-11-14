import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './ps';

const held = () => bench({ faction: 'hacan', start: { technologies: [id] } });

describe('technology:ps Plasma Scoring', () => {
  // "When 1 or more of your units use BOMBARDMENT or SPACE CANNON, 1 of those units may roll 1 additional die."
  // Checks: the technology is a reminder in the blocks of the battle in space (SPACE CANNON) and of the invasion
  // (BOMBARDMENT), and nothing else.
  // Why nothing is validated here: it changes a roll, and the plan rolls no dice; no check of the plan speaks of dice.
  test('technology:ps is a hint of the combat and the invasion', () => {
    const table = held();
    quote(table.pack, id, '1 of those units may roll 1 additional die');
    expect(effect(table.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat', 'invasion'] });
  });

  // Checks: held, it is shown among the reminders of both steps, and not in the production block.
  // Why nothing is validated here: as above; the reminder is the whole of what the app does with it.
  test('technology:ps held is shown in the combat and invasion blocks only', () => {
    const table = held();
    const board = endOf(table);
    expect(hintsAt(table.pack, board, 'combat', ['me']).map(c => c.id)).toContain(id);
    expect(hintsAt(table.pack, board, 'invasion', ['me']).map(c => c.id)).toContain(id);
    expect(hintsAt(table.pack, board, 'production', ['me']).map(c => c.id)).not.toContain(id);
  });
});
