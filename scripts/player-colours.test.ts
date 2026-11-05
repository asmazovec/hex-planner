import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { PLAYER_COLOURS } from '../src/ui/units/sprites';

test('the token colours are the ones of the theme', () => {
  const theme = readFileSync('src/ui/theme.css', 'utf8');
  PLAYER_COLOURS.forEach((colour, i) => expect(theme).toContain(`--player-${i + 1}: ${colour};`));
});
