import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { componentById } from '../../domain/components';
import { setLanguage } from '../../i18n';
import { ComponentCard } from './ComponentCard';

const pack = loadPack(['pok'], 'en');
const def = (id: string) => componentById(pack, id)!;

afterEach(cleanup);
beforeEach(() => setLanguage('en'));

describe('the card of a component', () => {
  test('its text is its own details: folded at first, a press on the card opens them inside the same card, under its head', async () => {
    render(<ComponentCard def={def('relic:shard')} pack={pack} held><span>below</span></ComponentCard>);
    const card = screen.getByTestId('component-relic:shard');
    const head = within(card).getByRole('button', { name: /^Shard of the Throne/, expanded: false });
    expect(card.querySelector('.component-text')).toBeNull();
    await userEvent.click(head);
    expect(head).toHaveAttribute('aria-expanded', 'true');
    const details = document.getElementById(head.getAttribute('aria-controls')!)!;
    expect(card).toContainElement(details);
    expect(details).toHaveTextContent(pack.texts['relic:shard'].slice(0, 20));
    // The head stays the first thing of the card: the details grow down from it, and what stands under the card's row after them.
    expect(card.firstElementChild).toContainElement(head);
    expect(head.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(details.compareDocumentPosition(screen.getByText('below')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await userEvent.click(head);
    expect(card.querySelector('.component-text')).toBeNull();
  });

  test('the card is one frame: the edge of what is held is the card\'s, not its head\'s', () => {
    render(<ComponentCard def={def('relic:shard')} pack={pack} held />);
    const card = screen.getByTestId('component-relic:shard');
    expect(card).toHaveClass('component-card', 'on');
    expect(within(card).getByRole('button', { name: /^Shard of the Throne/ })).toHaveClass('component-head');
  });

  test('a technology says its type by a mark at its name; a unit upgrade has a mark of its own; other components have none', () => {
    render(<><ComponentCard def={def('technology:amd')} pack={pack} /><ComponentCard def={def('technology:pds2')} pack={pack} /><ComponentCard def={def('relic:shard')} pack={pack} /></>);
    expect(within(screen.getByTestId('component-technology:amd')).getByRole('img', { name: 'Propulsion' })).toBeVisible();
    expect(within(screen.getByTestId('component-technology:pds2')).getByRole('img', { name: 'Unit upgrade' })).toBeVisible();
    expect(within(screen.getByTestId('component-relic:shard')).queryByRole('img')).toBeNull();
    // The name still comes first for the screen reader.
    expect(within(screen.getByTestId('component-technology:amd')).getByRole('button', { name: /^Antimass Deflectors/ })).toBeVisible();
  });

  test('a note held by another player says with whom it is', () => {
    render(<ComponentCard def={def('promissory:<color>_ta@me')} pack={pack} where={{ label: 'with Hacan', color: 3 }} />);
    expect(screen.getByTestId('component-promissory:<color>_ta@me')).toHaveTextContent('with Hacan');
  });
});
