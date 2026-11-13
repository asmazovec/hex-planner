import { describe, expect, test } from 'vitest';
import { convertFile } from './migrate-effects';

const HINT = `/** Harrow. */
import type { ComponentEffect } from '../../types';

export const id = 'ability:harrow';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['invasion'] };
`;

const PASSIVE = `import { plusSpeed } from '../../helpers/movement';
import type { ComponentEffect, ModifierContext } from '../../types';

export const id = 'technology:gd';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  modify: { speed: (value, ctx) => plusSpeed(value, ctx, 1) },
};
`;

const self = (): 'self' => 'self';

describe('the effect codemod', () => {
  test('a one-line hint becomes an ability with the holder read from the card', () => {
    const done = convertFile(HINT, () => 'others');
    expect(done).toMatchObject({ holder: 'others', tier: 'hint' });
    const output = (done as { output: string }).output;
    expect(output).toContain("import type { Ability } from '../../../../game/abilities/types';");
    expect(output).toContain("export const ability: Ability = { holder: 'others', tier: 'hint', rule: id, hintAt: ['invasion'] };");
    expect(output).not.toContain('ComponentEffect');
  });

  test('a passive effect that never reads the old state is converted; its other imports stay', () => {
    const done = convertFile(PASSIVE, self);
    expect(done).toMatchObject({ holder: 'self', tier: 'passive' });
    const output = (done as { output: string }).output;
    expect(output).toContain("import type { ModifierContext } from '../../types';");
    expect(output).toContain("import type { Ability } from '../../../../game/abilities/types';");
    expect(output).toContain("export const ability: Ability = {\n  holder: 'self',\n  tier: 'passive',");
  });

  test('line endings of the file are kept', () => {
    const done = convertFile(HINT.replace(/\n/g, '\r\n'), self) as { output: string };
    expect(done.output.includes('\r\n')).toBe(true);
    expect(done.output.replace(/\r\n/g, '').includes('\n')).toBe(false);
  });

  test.each([
    ['plays', PASSIVE.replace('modify:', 'play: () => undefined, modify:'), 'has `play`'],
    ['waives', HINT.replace("hintAt: ['invasion']", "hintAt: [], waive: []"), 'has `waive`'],
    ['reads the old state', PASSIVE.replace('plusSpeed(value, ctx, 1)', 'ctx.state ? value : 0'), 'modify reads `state`'],
    ['has no effect', 'export const id = "x";', 'no `effect`'],
  ])('a file that %s is left, with the reason', (_, source, reason) => {
    expect(convertFile(source, self)).toEqual({ left: reason });
  });
});
