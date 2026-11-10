import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { TokenKind } from '../../domain/hexLayout';
import { setLanguage } from '../../i18n';
import { UnitDraft, type UnitDraftProps, type UnitDraftRow } from './UnitDraft';

afterEach(cleanup);
beforeEach(() => setLanguage('en'));

const KINDS: TokenKind[] = ['infantry', 'mech'];
const NAMES: Record<string, string> = { infantry: 'Infantry', mech: 'Mech' };
type Picked = Record<string, Partial<Record<TokenKind, number>>>;

const rowsOf = (picked: Picked, extra: Partial<UnitDraftRow> = {}): UnitDraftRow[] => ['Alpha', 'Beta'].map(place => ({
  id: place, label: place, place: <span>{place}</span>, ...extra,
  items: KINDS.map(kind => ({ kind, picked: picked[place]?.[kind] ?? 0, takeLabel: `Take ${NAMES[kind]}`, returnLabel: `Return ${NAMES[kind]}` })),
}));

/** Two planets that take from one stock, as a landing does: the caller counts what is left for all the rows. */
function Shared({ arrived, onTake = vi.fn() }: { arrived: Partial<Record<TokenKind, number>>; onTake?: UnitDraftProps['onTake'] }) {
  const [picked, setPicked] = useState<Picked>({});
  const change = (row: string, kind: TokenKind, by: number) => setPicked({ ...picked, [row]: { ...picked[row], [kind]: (picked[row]?.[kind] ?? 0) + by } });
  const taken = (kind: TokenKind) => Object.values(picked).reduce((sum, row) => sum + (row[kind] ?? 0), 0);
  const stock = Object.fromEntries(KINDS.map(kind => [kind, (arrived[kind] ?? 0) - taken(kind)]));
  return (
    <UnitDraft
      rows={rowsOf(picked)} stock={stock} colour="#7fb2ff" stockLabel="Arrived" pickedLabel="Landed"
      onTake={(row, kind) => { onTake(row, kind); change(row, kind, 1); }} onReturn={(row, kind) => change(row, kind, -1)}
    />
  );
}

const row = (name: string) => within(screen.getByRole('group', { name }));
const take = (place: string, unit: string) => row(place).getByRole('button', { name: `Take ${unit}` });
const back = (place: string, unit: string) => row(place).queryByRole('button', { name: `Return ${unit}` });
/** What stands in the two zones of a row, in order: the buttons of the stock, and the places of the tray. */
const cells = (place: string) => ({
  stock: [...row(place).getByRole('group', { name: 'Arrived' }).children].map(el => el.getAttribute('aria-label')),
  tray: row(place).getByRole('group', { name: 'Landed' }).children.length,
});

test('a row is its place, a button per kind with what is left, and a tray with one place per kind', () => {
  render(<Shared arrived={{ infantry: 3, mech: 1 }} />);
  expect(row('Alpha').getByText('Alpha')).toBeVisible();
  expect(cells('Alpha')).toEqual({ stock: ['Take Infantry', 'Take Mech'], tray: 2 });
  expect(take('Alpha', 'Infantry')).toHaveTextContent('+3');
  expect(take('Alpha', 'Mech')).toHaveTextContent('+1');
  // Nothing is taken: the places of the tray are outlines, not controls.
  expect(row('Alpha').getByRole('group', { name: 'Landed' }).querySelectorAll('button')).toHaveLength(0);
  expect(row('Alpha').getByRole('group', { name: 'Landed' }).querySelectorAll('.draft-slot[aria-hidden="true"]')).toHaveLength(2);
});

test('taking and returning changes no place: the order and the number of cells do not follow what is picked', async () => {
  render(<Shared arrived={{ infantry: 3, mech: 2 }} />);
  const before = [cells('Alpha'), cells('Beta')];
  await userEvent.click(take('Alpha', 'Mech'));
  expect(back('Alpha', 'Mech')).toHaveTextContent('×1');
  expect(back('Alpha', 'Infantry')).toBeNull();
  expect([cells('Alpha'), cells('Beta')]).toEqual(before);
  // The chip of the second kind stands in the second place of the tray, with the first one still empty.
  const tray = row('Alpha').getByRole('group', { name: 'Landed' });
  expect(tray.children[0]).toHaveClass('draft-slot');
  expect(tray.children[1]).toBe(back('Alpha', 'Mech'));
  await userEvent.click(take('Alpha', 'Infantry'));
  await userEvent.click(back('Alpha', 'Infantry')!);
  await userEvent.click(back('Alpha', 'Mech')!);
  expect([cells('Alpha'), cells('Beta')]).toEqual(before);
  expect(back('Alpha', 'Mech')).toBeNull();
});

test('the stock is one for all the rows: the last one taken in a row puts the button out in every row at once', async () => {
  const onTake = vi.fn();
  render(<Shared arrived={{ infantry: 2, mech: 1 }} onTake={onTake} />);
  await userEvent.click(take('Alpha', 'Infantry'));
  expect(take('Beta', 'Infantry')).toHaveTextContent('+1');
  expect(take('Beta', 'Infantry')).toBeEnabled();
  await userEvent.click(take('Beta', 'Infantry'));
  for (const place of ['Alpha', 'Beta']) {
    expect(take(place, 'Infantry')).toBeDisabled();
    expect(take(place, 'Infantry')).toHaveClass('draft-take-out');
    expect(take(place, 'Infantry')).toHaveTextContent('0');
    expect(take(place, 'Infantry')).toHaveAttribute('title', 'Take Infantry: none left');
    expect(take(place, 'Mech')).toBeEnabled();
  }
  // A disabled button takes no tap.
  await userEvent.click(take('Alpha', 'Infantry'));
  expect(onTake).toHaveBeenCalledTimes(2);
  // One returned anywhere lights the kind again everywhere.
  await userEvent.click(back('Alpha', 'Infantry')!);
  expect(take('Alpha', 'Infantry')).toBeEnabled();
  expect(take('Beta', 'Infantry')).toBeEnabled();
});

test('a stock that never ends shows no count and never goes out', async () => {
  const onTake = vi.fn();
  render(<UnitDraft rows={rowsOf({ Alpha: { infantry: 40 } })} colour="#7fb2ff" stockLabel="Tokens" pickedLabel="Placed" onTake={onTake} onReturn={vi.fn()} />);
  expect(take('Alpha', 'Infantry')).toHaveTextContent(/^\+$/);
  expect(take('Alpha', 'Infantry')).toBeEnabled();
  expect(back('Alpha', 'Infantry')).toHaveTextContent('×40');
  await userEvent.click(take('Beta', 'Mech'));
  expect(onTake).toHaveBeenLastCalledWith('Beta', 'mech');
});

test('a row or a kind is blocked for a reason of its own: the same look, and the title says why', () => {
  const rows = rowsOf({});
  rows[0].blockedReason = 'your command token is here';
  rows[1].items[1].blockedReason = 'no dock on the planet';
  rows[1].items[1].price = '2';
  render(<UnitDraft rows={rows} stock={{ infantry: 5, mech: 5 }} colour="#7fb2ff" stockLabel="Stock" pickedLabel="Picked" onTake={vi.fn()} onReturn={vi.fn()} />);
  expect(take('Alpha', 'Infantry')).toBeDisabled();
  expect(take('Alpha', 'Mech')).toHaveAttribute('title', 'Take Mech: your command token is here');
  expect(take('Beta', 'Infantry')).toBeEnabled();
  expect(take('Beta', 'Mech')).toBeDisabled();
  expect(take('Beta', 'Mech')).toHaveClass('draft-take-out');
  expect(take('Beta', 'Mech')).toHaveAttribute('title', 'Take Mech: no dock on the planet');
  // The price and the count stay on a blocked button.
  expect(take('Beta', 'Mech')).toHaveTextContent('+25');
});

test('a row counts its own stock where it has one, apart from the shared one', () => {
  const rows = rowsOf({});
  rows[0].items[0].left = 0;
  render(<UnitDraft rows={rows} stock={{ infantry: 5, mech: 5 }} colour="#7fb2ff" stockLabel="Stock" pickedLabel="Picked" onTake={vi.fn()} onReturn={vi.fn()} />);
  expect(take('Alpha', 'Infantry')).toBeDisabled();
  expect(take('Beta', 'Infantry')).toBeEnabled();
  expect(take('Beta', 'Infantry')).toHaveTextContent('+5');
});

test('the zones and the controls are named for a screen reader; the arrow and the empty places are hidden from it', async () => {
  const onReturn = vi.fn();
  render(<UnitDraft rows={rowsOf({ Beta: { mech: 2 } })} stock={{ infantry: 1, mech: 0 }} colour="#7fb2ff" stockLabel="Arrived" pickedLabel="Landed" onTake={vi.fn()} onReturn={onReturn} />);
  expect(screen.getAllByRole('group', { name: 'Arrived' })).toHaveLength(2);
  expect(screen.getAllByRole('group', { name: 'Landed' })).toHaveLength(2);
  expect(document.querySelectorAll('.draft-arrow[aria-hidden="true"]')).toHaveLength(2);
  expect(back('Beta', 'Mech')).toHaveAttribute('title', 'Return Mech');
  await userEvent.click(back('Beta', 'Mech')!);
  expect(onReturn).toHaveBeenCalledWith('Beta', 'mech');
});
