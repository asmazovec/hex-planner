import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
}));

import { loadPack } from '../../data/loadPack';
import { project, systemPlanets } from '../../domain/project';
import type { Warning, WarningCode } from '../../domain/types';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { CARD, type CardEntry } from '../../domain/strategy';
import { ExpeditionEditor } from './ExpeditionEditor';
import { StrategyEditor } from './StrategyEditor';
import type { TacticalEntry } from './tactical';
import { TacticalEditor } from './TacticalEditor';
import { placeWarnings, placesOf } from './warningPlaces';

const pack = loadPack(['pok', 'te']);
const HOME = '1,0';
const SOURCE = '0,1';

const game = () => useGame.getState().game!;
const before = () => project(game(), game().plans[0], 'forecast', pack).state;

beforeEach(() => {
  setLanguage('en');
  useGame.getState().newGame({ expansions: ['pok', 'te'], playerCount: 6, faction: 'arborec' }, pack);
  useGame.getState().setTile(HOME, pack.factions.arborec.homeTile);
  useGame.getState().setTile(SOURCE, '25');
});
afterEach(cleanup);

const LANDING: Warning = { code: 'landingOverLimit', params: { unit: 'infantry', wanted: 2, available: 0 } };
const SHORT: Warning = { code: 'shortResources', params: { needed: 3, paid: 1 } };
const GROUP: Warning = { code: 'capacityGroup', params: { from: SOURCE, load: 3, capacity: 1 } };
const FLEET: Warning = { code: 'fleetPool', params: { systemId: HOME, ships: 5, fleet: 3 } };

function editor(warnings: Warning[], patch: Partial<TacticalEntry> = {}, pickerFrom: string | null = null) {
  const entry = {
    id: 'e', type: 'tactical', status: 'planned', systemId: HOME,
    moves: [{ from: SOURCE, units: {} }], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 }, ...patch,
  } as TacticalEntry;
  return render(
    <TacticalEditor
      game={game()} pack={pack} entry={entry} before={before()} warnings={warnings} pickerFrom={pickerFrom} manualPayment={false}
      choosing={null} onChoose={() => undefined}
      onUpdate={() => undefined} onOpenPicker={() => undefined} onManualPayment={() => undefined} onFly={() => undefined} onOpenShop={() => undefined} onOpenBattle={() => undefined} onDone={() => undefined}
    />,
  );
}

/** The heading of the block a warning stands in. */
const blockOf = (text: RegExp): string => {
  const block = screen.getByText(text).closest('.editor-section, .tactical-editor')!;
  return block.classList.contains('tactical-editor') ? 'outside' : block.querySelector('strong, summary')!.textContent!;
};

describe('where a warning goes', () => {
  test('every warning code has a place', () => {
    const codes: WarningCode[] = ['shortResources', 'shortInfluence', 'shortTradeGoods', 'planetExhausted', 'capacityGroup', 'capacitySystem', 'fleetPool', 'unitsMissing', 'landingOverLimit', 'sliceTaken', 'shortStrategy', 'primaryRepeated', 'tokensOver', 'poolNegative', 'systemHasToken', 'constructionUnits', 'speedShort', 'routeBlocked', 'sourceActivated'];
    for (const code of codes) expect(placesOf({ code, params: {} }).length).toBeGreaterThan(0);
  });

  test('a place gives its warnings once, and the rest is what no shown place took', () => {
    const placer = placeWarnings([LANDING, SHORT, FLEET]);
    expect(placer.at('payment')).toEqual([SHORT]);
    expect(placer.at('payment')).toEqual([]);
    expect(placer.at('production')).toEqual([FLEET]);
    // A warning with two places stands in both.
    expect(placer.at('action')).toEqual([FLEET]);
    expect(placer.rest()).toEqual([LANDING]);
  });

  test('a filter leaves the other warnings of the place to a later call', () => {
    const speed: Warning = { code: 'speedShort', params: { from: SOURCE, unit: 'carrier', move: 1, steps: 2 } };
    const placer = placeWarnings([GROUP, speed]);
    expect(placer.at('route', w => w.code === 'capacityGroup')).toEqual([GROUP]);
    expect(placer.at('route')).toEqual([speed]);
  });
});

describe('the strategy editor', () => {
  const noop = () => undefined;
  function card(warnings: Warning[], patch: Partial<CardEntry>) {
    const entry = { id: 'c', type: 'strategic', status: 'planned', ...patch } as CardEntry;
    return render(
      <StrategyEditor
        game={game()} pack={pack} round={game().plans[0].rounds[0]} entry={entry} before={before()} warnings={warnings} manualPayment={false} picking={null}
        onUpdate={noop} onManualPayment={noop} onPick={noop} onOpenShop={noop} onStartTactical={noop} onOpenTactical={noop} onCancel={noop} onDone={noop}
      />,
    );
  }
  const follows = (first: Element, second: Element) => (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

  test('what the mode and the card decide stands right under the cards, above their text', () => {
    const { container } = card([{ code: 'primaryRepeated', params: { held: 1 } }], { card: CARD.leadership });
    const warning = screen.getByText(/primary has already been played/);
    expect(follows(container.querySelector('.card-grid')!, warning)).toBe(true);
    expect(follows(warning, container.querySelector('.card-text')!)).toBe(true);
  });

  test('a warning about tokens stands in the block of the tokens', () => {
    card([{ code: 'tokensOver', params: { given: 5, free: 3 } }], { card: CARD.leadership });
    const block = screen.getByText(/^Distributed 5 tokens/).closest('.editor-section')!;
    expect(block).toHaveTextContent(/Distribute tokens/);
  });

  test('a warning about the payment stands in the block of the payment', () => {
    card([{ code: 'shortInfluence', params: { needed: 3, paid: 0 } }], { card: CARD.leadership, effects: { boughtTokens: 1, payment: { planets: [], tradeGoods: 0 } } });
    expect(screen.getByRole('group', { name: 'Payment' })).toHaveTextContent(/Not enough influence/);
  });

  test('a warning about what the card builds stands right after the button of the build', () => {
    card([{ code: 'constructionUnits', params: {} }], { type: 'secondary', card: CARD.construction });
    const list = screen.getByText(/gives the secondary a structure only/).closest('ul')!;
    expect(list.previousElementSibling).toHaveClass('option');
  });

  test('a warning whose block the card does not have is not lost', () => {
    card([{ code: 'tokensOver', params: { given: 5, free: 3 } }], { card: CARD.trade });
    expect(screen.getByText(/^Distributed 5 tokens/)).toBeVisible();
  });
});

describe('the expedition editor', () => {
  const expedition = (warnings: Warning[], sliceId: string | null) => render(
    <ExpeditionEditor game={game()} pack={pack} sliceId={sliceId} payment={{ planets: [], tradeGoods: 0 }} owners={{}} before={before()} warnings={warnings} onChange={() => undefined} />,
  );

  test('a taken part is said right under the parts', () => {
    const { container } = expedition([{ code: 'sliceTaken', params: { sliceId: 'res5' } }], 'res5');
    expect(container.querySelector('.slice-grid')!.nextElementSibling).toHaveTextContent(/already taken/);
  });

  test('a short payment stands in the payment, and a part paid in trade goods says it by the parts', () => {
    expedition([SHORT], 'res5');
    expect(screen.getByRole('group', { name: 'Payment' })).toHaveTextContent(/short by 2/);
    cleanup();
    const { container } = expedition([{ code: 'shortTradeGoods', params: { needed: 3, have: 0 } }], 'tg3');
    expect(container.querySelector('.slice-grid')!.nextElementSibling).toHaveTextContent(/Not enough trade goods/);
  });
});

describe('the tactical editor', () => {
  test('a landing warning stands in the landing block', () => {
    const planet = systemPlanets(game(), HOME, pack)[0].id;
    editor([LANDING], { landings: [{ planetId: planet, units: { infantry: 2 } }] });
    expect(blockOf(/^Landing needs/)).toMatch(/^Landing/);
  });

  test('a payment warning stands in the payment block', () => {
    editor([SHORT], { production: { fighter: 2 } });
    expect(screen.getByRole('group', { name: 'Payment' })).toHaveTextContent(/short by 2/);
  });

  test('a capacity warning follows the row of its source', () => {
    const { container } = editor([GROUP]);
    const row = container.querySelector('.source-row')!;
    expect(row.nextElementSibling).toHaveTextContent(/capacity/i);
  });

  test('with the picker open the warning of its source stands in the picker, not in the list of moves', () => {
    const { container } = editor([GROUP, FLEET], {}, SOURCE);
    const picker = container.querySelector('.unit-picker')!;
    expect(screen.getByText(/^Group from/).closest('.unit-picker')).toBe(picker);
    expect(picker).toHaveTextContent(/fleet pool/);
  });

  test('in the picker an exceeded fleet is a warning, not a line of its own', () => {
    const entry = { moves: [{ from: SOURCE, units: { fighter: 9 } }] };
    const { container } = editor([FLEET], { ...entry, production: { dreadnought: 9 } }, SOURCE);
    const picker = container.querySelector('.unit-picker')!;
    expect(picker.querySelector('.picker-fleet')).toBeNull();
    expect(picker.querySelector('.place-warnings')).toHaveTextContent(/fleet pool/);
    expect(picker.querySelector('.meter-over')).toBeNull();
  });

  test('the fleet limit is the result of the whole action: it stands in its own block at the very end', () => {
    const { container } = editor([FLEET, SHORT], { production: { fighter: 2 } });
    const result = screen.getByRole('group', { name: 'Action result' });
    expect(result).toHaveTextContent(/fleet pool/);
    expect(container.querySelector('.tactical-editor')!.lastElementChild).toBe(result);
  });

  test('with ships chosen it is said in the sources too, where they are chosen', () => {
    const { container } = editor([FLEET]);
    const sections = [...container.querySelectorAll('.editor-section')].filter(s => s.textContent!.includes('fleet pool')).map(s => s.querySelector('strong')!.textContent);
    expect(sections).toEqual(['Sources', 'Action result']);
  });

  test('with only a production there is no word in the sources', () => {
    const { container } = editor([FLEET], { moves: [], production: { fighter: 2 } });
    const sections = [...container.querySelectorAll('.editor-section')].filter(s => s.textContent!.includes('fleet pool')).map(s => s.querySelector('strong')!.textContent);
    expect(sections).toEqual(['Action result']);
  });

  test('no result block without such a warning', () => {
    editor([SHORT], { production: { fighter: 2 } });
    expect(screen.queryByRole('group', { name: 'Action result' })).toBeNull();
  });

  test('production and landing are named by the rules, and optional is a note, not brackets', () => {
    const planet = systemPlanets(game(), HOME, pack)[0].id;
    editor([], { landings: [{ planetId: planet, units: { infantry: 1 } }] });
    expect(screen.getByText('Production')).toBeVisible();
    expect(screen.getByText('Landing')).toBeVisible();
    expect(screen.getAllByText('optional').every(note => note.classList.contains('optional-note'))).toBe(true);
    expect(screen.queryByText(/\(optional\)/)).toBeNull();
  });

  test('no word about a space dock until something is built', () => {
    useGame.getState().setTile(SOURCE, '25');
    const { unmount } = render(
      <TacticalEditor
        game={game()} pack={pack} before={before()} warnings={[]} pickerFrom={null} manualPayment={false} choosing={null} onChoose={() => undefined}
        entry={{ id: 'e', type: 'tactical', status: 'planned', systemId: SOURCE, moves: [], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 } } as unknown as TacticalEntry}
        onUpdate={() => undefined} onOpenPicker={() => undefined} onManualPayment={() => undefined} onFly={() => undefined} onOpenShop={() => undefined} onOpenBattle={() => undefined} onDone={() => undefined}
      />,
    );
    expect(screen.queryByText('No space dock in this system.')).toBeNull();
    unmount();
    render(
      <TacticalEditor
        game={game()} pack={pack} before={before()} warnings={[]} pickerFrom={null} manualPayment={false} choosing={null} onChoose={() => undefined}
        entry={{ id: 'e', type: 'tactical', status: 'planned', systemId: SOURCE, moves: [], landings: [], production: { fighter: 1 }, payment: { planets: [], tradeGoods: 0 } } as unknown as TacticalEntry}
        onUpdate={() => undefined} onOpenPicker={() => undefined} onManualPayment={() => undefined} onFly={() => undefined} onOpenShop={() => undefined} onOpenBattle={() => undefined} onDone={() => undefined}
      />,
    );
    expect(screen.getByText('No space dock in this system.')).toBeVisible();
  });

  test('a warning whose block is not shown is not lost: it stands first, above the blocks', () => {
    const { container } = editor([SHORT]);
    const warning = container.querySelector('.warning-text')!;
    expect(warning.closest('.editor-section')).toBeNull();
    const first = container.querySelector('.editor-section')!;
    expect(warning.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('all warnings wear the same mark of a block', () => {
    const { container } = editor([SHORT, GROUP], { production: { fighter: 2 } });
    expect(container.querySelectorAll('.place-warnings .warning-text, .warning-text.place-warnings').length).toBe(container.querySelectorAll('.warning-text').length);
  });
});
