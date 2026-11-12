import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { bench, componentAction, quote } from '../kit';
import { id } from './xxchahero-te';

uiBench();

const table = (choices: Record<string, number>) => {
  const action = componentAction(id, { choices });
  return { action, table: bench({ faction: 'xxcha', expansions: ['pok', 'te'], start: { leaders: { [id]: 'unlocked' } }, entries: [action] }) };
};

// "ACTION: Place any combination of up to 4 PDS or mechs onto planets you control"
// Checks: a PDS placed by the hero on Target One, which the Xxcha do not control, shows that structures go only on
// one's own planets.
// Why the check is NOT redundant here: the hero places on planets the Xxcha control only.
test('leader:xxchahero-te a PDS on a planet not controlled shows its warning standing', () => {
  const xxcha = table({ 'pds@t1': 1 });
  quote(xxcha.table.pack, id, 'onto planets you control');
  showWarnings(xxcha.table, xxcha.action);
  expectShownStanding('structureNotControlled');
});

// Checks: two PDS on Home One, a planet of the Xxcha, show no warning of the kind.
test('leader:xxchahero-te two PDS on a planet of the Xxcha show no structure warning', () => {
  const xxcha = table({ 'pds@h1': 2 });
  showWarnings(xxcha.table, xxcha.action);
  expectNotShown('structureNotControlled');
  expectNotShown('structureLimit');
});

test.todo('leader:xxchahero-te the component action asks for up to four PDS or mechs and their planets: the component editor is not in the bench yet');
