import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../../testing/old/domain/types';
import secretsOverLimit from '../../../rules/codes/secretsOverLimit';
import { adjust, bench, quote } from '../kit';
import { id } from './obsidian';

uiBench();

const SECRETS = ['secretObjective:ans', 'secretObjective:btgk', 'secretObjective:ctr', 'secretObjective:csl', 'secretObjective:dtgs'];
const draw = (n: number): Entry => ({ ...adjust({}), gains: SECRETS.slice(3, n) });
const table = (entry: Entry, relics: string[]) =>
  bench({ faction: 'sol', expansions: ['pok'], start: { relics, secrets: SECRETS.slice(0, 2), scored: SECRETS.slice(2, 3) }, entries: [entry] });

// "You can have 1 additional scored or unscored secret objective."
// Checks: a fourth secret objective drawn shows no warning with the relic, and the warning stands without it.
// Why the default limit does not apply: the limit of three is raised by one, a modify of the number.
test('relic:obsidian a fourth secret objective shows no warning, and shows one without the relic', () => {
  const entry = draw(4);
  const held = table(entry, [id]);
  quote(held.pack, id, 'You can have 1 additional scored or unscored secret objective.');
  const live = showWarnings(held, entry);
  expect(live.warnings().some(w => w.code === secretsOverLimit.code)).toBe(false);
  expectNotShown(secretsOverLimit.code);
});

// Checks: the same fourth objective without the relic stands as a breach on the screen.
// Why the check is NOT redundant here: no component of this player raises the limit.
test('relic:obsidian not held, the fourth secret objective is warned of on the screen', () => {
  const entry = draw(4);
  showWarnings(table(entry, []), entry);
  expectShownStanding(secretsOverLimit.code);
});
