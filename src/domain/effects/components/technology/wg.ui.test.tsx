import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showFlight, showWarnings, take, uiBench } from '../../../../ui/testing/effects';
import type { ExtensionCode } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import type { Player } from '../../../players';
import { bench, componentAction, FAR, FARTHER, quote, tactical, TARGET } from '../kit';
import { id } from './wg';

uiBench();

const PLACE = 'wormholeTokenPlace' as ExtensionCode;
const RIVAL: Player = { id: 'o1', faction: 'letnev', vp: 0, seat: 2, color: 2 };
const generate = (systemId: string) => componentAction(id, { choices: { token: 'alpha', systemId } } as Partial<Entry>);

// "ACTION: Exhaust this card to place or move a Creuss wormhole token into either a system that contains a planet you
//  control or a non-home system that does not contain another player's ships."
// Checks: after the token is placed in TARGET, the flight of a carrier (move 1) from TARGET two systems on shows no
// speed warning: Slipstream counts the token as a wormhole.
// Why the check is redundant here: the ship starts in a system with an alpha wormhole, so its move value is 2.
test('technology:wg after the token is placed, a carrier flies two systems from there with no speed warning', async () => {
  const move = tactical(FARTHER, { moves: [{ from: TARGET, units: {}, via: [FAR] }] });
  const table = bench({ faction: 'ghost', units: { [TARGET]: { carrier: 1 } }, start: { technologies: [id] }, entries: [generate(TARGET), move] });
  quote(table.pack, id, 'place or move a Creuss wormhole token');
  showFlight(table, move, TARGET);
  await take('Carrier');
  expectNotShown('speedShort');
});

// "... or a non-home system that does not contain another player's ships."
// Checks: the token put into FAR, which holds a Letnev cruiser and no planet of mine, shows the warning standing.
// Why the check is NOT redundant here: the system meets neither condition of the card.
test('technology:wg a token put among another player\'s ships shows the warning standing', () => {
  const entry = generate(FAR);
  showWarnings(bench({ faction: 'ghost', start: { technologies: [id] }, entries: [entry], game: { opponents: [RIVAL], enemyUnits: { [FAR]: { o1: { cruiser: 1 } } } } }), entry);
  expectShownStanding(PLACE);
});
