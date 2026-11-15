import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
}));

import { loadPack } from '../../../data/loadPack';
import { setLanguage } from '../../../i18n';
import { useGame } from '../../../state/gameStore';
import { boardBefore, timelineOf } from '../../../state/projection';
import { writeSaved } from '../../../state/turnBridge';
import * as edits from '../../../testing/entries';
import { opponentAt } from '../../../testing/store';
import type { PlayerId } from '../../../game/types';
import { HexStage } from './HexStage';
import { turnPurchases } from './turnPurchases';

/**
 * A structure built on the big hex stands on its planet there, as the row of the shop counts it: built by hand in
 * «Create», and by the Construction card, on a planet of the player and on one the player does not control. The replay
 * warns of the last (24.2) and places nothing on the board, so the hex draws what the card holds.
 */
const pack = loadPack(['pok'], 'en');
const SLOT = '1,0';
const quann = () => pack.tiles['25'].planetIds[0];
const store = () => useGame.getState();
const stack = (owner: PlayerId, kind: 'pds' | 'spacedock') => document.querySelector(`.stage-hex [data-stack="${owner}|${kind}|0"]`);
const tap = (name: string) => userEvent.click(screen.getByRole('button', { name }));

afterEach(cleanup);
beforeEach(() => {
  setLanguage('en');
  store().newGame({ expansions: ['pok'], playerCount: 4, faction: 'sol' }, pack);
  store().setTile(SLOT, '25');
});

/** The hex as the plan screen opens it for the Construction card of an entry. */
function CardHex({ id, viewer }: { id: string; viewer?: PlayerId }) {
  const saved = useGame(s => s.saved)!;
  const line = timelineOf(saved, saved.activePlanId, 'forecast', pack);
  const view = { table: line.table, board: boardBefore(line, id) };
  const turn = writeSaved(saved, id)!;
  return <HexStage slot={SLOT} roundNo={1} pack={pack} viewer={viewer} owner={turn.turn.player} onClose={() => undefined} initialMode="build" only="build" onPurchase={turnPurchases(view, pack, turn, SLOT, false)} />;
}

describe('built by hand in Create', () => {
  test('on a planet of the player at the tablet, and of another shown player: the dock and the PDS stand on the hex', async () => {
    store().setPlanetControl(quann(), 'p1');
    render(<HexStage slot={SLOT} roundNo={1} pack={pack} onClose={() => undefined} initialMode="build" />);
    await tap('Space dock');
    await tap('PDS');
    expect(stack('p1', 'spacedock')).not.toBeNull();
    expect(stack('p1', 'pds')).not.toBeNull();
    cleanup();
    const other = opponentAt(0);
    render(<HexStage slot={SLOT} roundNo={1} pack={pack} viewer={other} onClose={() => undefined} initialMode="build" />);
    await tap('PDS');
    expect(stack(other, 'pds')).not.toBeNull();
  });
});

describe('built by the Construction card', () => {
  const card = (owner?: string) => edits.addEntry(1, { type: 'strategic', card: 4, effects: {} }, 'action', owner);

  test('on a planet the player controls', async () => {
    store().setPlanetControl(quann(), 'p1');
    render(<CardHex id={card()} />);
    await tap('Space dock');
    await tap('PDS');
    expect(stack('p1', 'spacedock')).not.toBeNull();
    expect(stack('p1', 'pds')).not.toBeNull();
  });

  test('on a planet nobody controls: the row counts them, and the hex draws them, ringed as bought; a tap takes one back', async () => {
    render(<CardHex id={card()} />);
    await tap('Space dock');
    await tap('PDS');
    expect(screen.getByRole('button', { name: 'Give back PDS' })).toBeVisible();
    expect(stack('p1', 'spacedock')).not.toBeNull();
    expect(stack('p1', 'pds')).not.toBeNull();
    await userEvent.click(stack('p1', 'pds')!.querySelector('.token-hit')!);
    const action = useGame.getState().saved!.plans[0].rounds[0].turns[0].action;
    expect(action.kind === 'strategic' && action.effects?.structures).toEqual([{ kind: 'spacedock', planetId: quann() }]);
    expect(stack('p1', 'spacedock')).not.toBeNull();
  });

  test('for another shown player, on a planet nobody controls', async () => {
    const other = opponentAt(0);
    render(<CardHex id={card(other)} viewer={other} />);
    await tap('PDS');
    await tap('PDS');
    expect(stack(other, 'pds')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'PDS ×2' })).toBeVisible();
  });
});
