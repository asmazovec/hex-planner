import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { GainsBlock } from '../../../../ui/plan/blocks/GainsBlock';
import { expectShownStanding, play, showTurn, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { AnyWarningCode, Entry } from '../../../types';
import { adjust, bench, componentAction, NEAR, quote } from '../kit';
import { id } from './crf1';
import { turnProps } from '../../../../ui/testing/turnProps';
import { kernelViewOf } from '../../../../ui/testing/view';
import { seedGame } from '../../../../testing/store';

uiBench();

const table = (entries: Entry[]) => bench({ faction: 'letnev', expansions: ['pok'], units: { [NEAR]: { carrier: 1 } }, entries });

// LRR 35.9: a relic fragment explored is placed faceup in the play area.
// Checks: in «Taken and discarded» the player takes the Cultural Relic Fragment drawn while exploring.
// Why the check is redundant here: nothing is lifted; the choice offers only what a player holds as a card today, and
// a relic fragment is held.
test('exploration:crf1 is taken in «Taken and discarded» of the entry that explores', async () => {
  const take = adjust({});
  const fragments = table([take]);
  quote(fragments.pack, id, 'ACTION: Purge 3 of your cultural relic fragments to gain 1 relic.');
  seedGame(fragments.game);
  const onChange = vi.fn();
  render(<GainsBlock {...turnProps(kernelViewOf(fragments.game, fragments.pack), fragments.pack, take, onChange)} pack={fragments.pack}/>);
  await userEvent.click(screen.getByRole('button', { name: '+ Took' }));
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), 'Cultural Relic Fragment');
  await userEvent.click(await screen.findByRole('button', { name: 'Choose Cultural Relic Fragment' }));
  expect(onChange).toHaveBeenCalledWith({ gains: [id] });
});

// "Purge 3 of your cultural relic fragments"
// Checks: the action with two fragments shows the warning that three are needed.
// Why the check is NOT redundant here: the text asks for three.
test('exploration:crf1 purged with two fragments shows the warning of fragments', () => {
  const action = componentAction(id, { spends: [id, id, id], gains: ['relic:shard'] });
  showWarnings(table([{ ...adjust({}), gains: [id, id] }, action]), action);
  expectShownStanding('relicFragmentsShort' as AnyWarningCode);
});

// "ACTION: Purge 3 of your cultural relic fragments to gain 1 relic."
// Checks: the component action offers the fragment, as any ACTION component, and keeps it as the component played.
// Why: the fragment's ACTION is a component action (LRR 73.1), so the picker of the action cannot leave exploration cards out.
test('exploration:crf1 is chosen as the component of a component action', async () => {
  const turn = componentAction(undefined as unknown as string);
  const live = showTurn(table([{ ...adjust({}), gains: [id, id, id] }, turn]), turn);
  await play('Cultural Relic Fragment');
  expect(live.entry().componentId).toBe(id);
});
