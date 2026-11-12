import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { useGame } from '../../../../state/gameStore';
import { GainsBlock } from '../../../../ui/plan/blocks/GainsBlock';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { AnyWarningCode, Entry } from '../../../types';
import { adjust, bench, componentAction, NEAR, quote } from '../kit';
import { id } from './irf1';

uiBench();

const table = (entries: Entry[]) => bench({ faction: 'letnev', expansions: ['pok'], units: { [NEAR]: { carrier: 1 } }, entries });

// LRR 35.9: a relic fragment explored is placed faceup in the play area.
// Checks: in «Taken and discarded» the player takes the Industrial Relic Fragment drawn while exploring.
// Why the check is redundant here: nothing is lifted; the choice offers only what a player holds as a card today, and
// a relic fragment is held.
test('exploration:irf1 is taken in «Taken and discarded» of the entry that explores', async () => {
  const take = adjust({});
  const fragments = table([take]);
  quote(fragments.pack, id, 'ACTION: Purge 3 of your industrial relic fragments to gain 1 relic.');
  useGame.setState({ game: fragments.game });
  const onChange = vi.fn();
  render(<GainsBlock entry={take} pack={fragments.pack} onChange={onChange} />);
  await userEvent.click(screen.getByRole('button', { name: '+ Took' }));
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), 'Industrial Relic Fragment');
  await userEvent.click(await screen.findByRole('button', { name: 'Choose Industrial Relic Fragment' }));
  expect(onChange).toHaveBeenCalledWith({ gains: [id] });
});

// "Purge 3 of your industrial relic fragments"
// Checks: the action with two fragments shows the warning that three are needed.
// Why the check is NOT redundant here: the text asks for three.
test('exploration:irf1 purged with two fragments shows the warning of fragments', () => {
  const action = componentAction(id, { spends: [id, id, id], gains: ['relic:shard'] });
  showWarnings(table([{ ...adjust({}), gains: [id, id] }, action]), action);
  expectShownStanding('relicFragmentsShort' as AnyWarningCode);
});
