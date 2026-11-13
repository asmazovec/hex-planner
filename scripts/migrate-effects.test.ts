import { describe, expect, test } from 'vitest';
import { convertFile, convertWaivers } from './migrate-effects';

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

const CRAFTY = `import handOverLimit from '../../../rules/codes/handOverLimit';
import type { ComponentEffect } from '../../types';

export const id = 'ability:crafty';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  waive: [{ code: handOverLimit.code, rule: 'You can have any number of action cards in your hand.' }],
};
`;

const PLAYING = `import type { ComponentEffect } from '../../types';

export const id = 'leader:mahactcommander';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  waive: [{
    code: 'systemHasToken',
    rule: 'you can activate systems that contain your command tokens.',
    when: (warning, { entry }) => entry?.type === 'tactical' && warning.params.systemId === entry.systemId,
  }],
  play: ({ state }) => { state.tokensOnMap = []; },
};
`;

describe('the waiver codemod', () => {
  test('a file that only waives becomes an ability with `permit`, the waivers unchanged', () => {
    const done = convertWaivers(CRAFTY, () => 'self');
    expect(done).toMatchObject({ holder: 'self' });
    const output = (done as { output: string }).output;
    expect(output).toContain("import type { Ability } from '../../../../game/abilities/types';");
    expect(output).toContain("export const ability: Ability = {\n  holder: 'self',\n  tier: 'passive',\n  rule: id,\n  permit: [{ code: handOverLimit.code,");
    expect(output).not.toContain('waive');
    expect(output).not.toContain('ComponentEffect');
  });

  test('a file that also plays keeps `play` in its effect and exports both shapes; a `when` of the entry and the warning is moved as it is', () => {
    const output = (convertWaivers(PLAYING, () => 'self') as { output: string }).output;
    expect(output).toContain("import type { Hooked } from '../../../../game/abilities/types';");
    expect(output).toContain('export const effect: ComponentEffect = {\n  tier: \'play\',\n  rule: id,\n  play:');
    expect(output).toContain("export const ability: Hooked = {\n  holder: 'self',\n  permit: [{");
    expect(output).toContain('when: (warning, { entry }) => entry?.type');
  });

  test('line endings are kept', () => {
    const output = (convertWaivers(PLAYING.replace(/\n/g, '\r\n'), () => 'self') as { output: string }).output;
    expect(output.replace(/\r\n/g, '').includes('\n')).toBe(false);
  });

  test.each([
    ['reads the old state of the owner', PLAYING.replace('{ entry }', '{ shared }').replace("entry?.type === 'tactical' && warning.params.systemId === entry.systemId", 'shared.holdings.hand.length > 0'), '`when` reads `shared`'],
    ['hands the whole context to a helper', PLAYING.replace('(warning, { entry })', '(warning, ctx)').replace("entry?.type === 'tactical' && warning.params.systemId === entry.systemId", 'helper(warning, ctx)'), '`when` uses the whole context'],
    ['has a typed `when`', PLAYING.replace('(warning, { entry })', '(warning: Warning, { entry })'), '`when` is typed'],
    ['has nothing to convert', "export const id = 'x';\nexport const effect: ComponentEffect = { tier: 'hint', rule: id };\n", 'no `waive`'],
  ])('a file that %s is left, with the reason', (_, source, reason) => {
    expect(convertWaivers(source, () => 'self')).toEqual({ left: reason });
  });
});

describe('the waiver codemod: what the owner held before the turn', () => {
  const held = (when: string): string => PLAYING.replace("when: (warning, { entry }) => entry?.type === 'tactical' && warning.params.systemId === entry.systemId,", `when: (warning, ctx) => ${when},`);

  test.each([
    ["ctx.before.holdings.leaders[id] === 'unlocked'", "ctx.had.card(id) === 'ready'"],
    ['ctx.before.holdings.hand.includes(id)', 'ctx.had.holds(id)'],
    ['ctx.before.holdings.relics.includes(id)', 'ctx.had.holds(id)'],
    ['Number(warning.params.needed) <= ctx.before.commodities', 'Number(warning.params.needed) <= ctx.had.commodities'],
    ["ctx.before.control[String(warning.params.planetId)] === 'me'", 'ctx.before.planets[String(warning.params.planetId)]?.owner === ctx.holder'],
  ])('%s is read from the board before the turn', (from, to) => {
    const output = (convertWaivers(held(from), () => 'self') as { output: string }).output;
    expect(output).toContain(`when: (warning, ctx) => ${to},`);
  });

  test('what the old state holds beyond these is left', () => {
    expect(convertWaivers(held('ctx.shared.holdings.technologies.length > 0'), () => 'self')).toEqual({ left: '`when` reads `shared`' });
  });
});

const SHIPS = `import { oneShipShort, routeBlockKind } from '../../helpers/movement';
import type { ComponentEffect } from '../../types';

export const id = 'technology:lwd';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  waive: [{
    code: 'routeBlocked',
    rule: 'Your ships can move through systems that contain other ships.',
    when: (warning, ctx) => routeBlockKind(warning, ctx) === 'ships' && oneShipShort(warning, ctx, 2) && hasAnomaly(ctx.game, String(warning.params.systemId), 'nebula', ctx.pack),
  }],
};
`;

describe('the waiver codemod: the questions about the map', () => {
  test('a helper asked with the context is asked of the context, and the import it leaves is dropped', () => {
    const output = (convertWaivers(SHIPS, () => 'self') as { output: string }).output;
    expect(output).toContain("when: (warning, ctx) => ctx.routeBlockKind(warning) === 'ships' && ctx.oneShipShort(warning, 2) && ctx.hasAnomaly(String(warning.params.systemId), 'nebula'),");
    expect(output).not.toContain("helpers/movement");
  });

  test('a helper that stays in use keeps its import', () => {
    const output = (convertWaivers(SHIPS.replace('routeBlockKind(warning, ctx) === \'ships\' && ', "routeBlockKind(warning, ctx) === 'ships' && other(warning) && "), () => 'self') as { output: string }).output;
    expect(output).toContain('ctx.routeBlockKind(warning)');
  });

  test('a helper of the file that takes the whole context is left', () => {
    expect(convertWaivers(SHIPS.replace('ctx.game, String(warning.params.systemId), \'nebula\', ctx.pack', 'ctx'), () => 'self')).toEqual({ left: '`when` uses the whole context' });
  });
});
