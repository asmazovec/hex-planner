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
import { AdjustmentEditor } from '../plan/editors/AdjustmentEditor';
import { ExpeditionEditor } from '../plan/editors/ExpeditionEditor';
import { EntrySteps } from '../plan/EntrySteps';
import { WarningList } from './WarningText';
import { StrategyEditor } from '../plan/editors/StrategyEditor';
import type { TacticalEntry } from '../plan/tactical';
import { TacticalEditor } from '../plan/editors/TacticalEditor';
import { flightWarnings, UnitPicker } from '../plan/editors/UnitPicker';
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
  // The flight of a source is a step that stands in the editor's place, with the warnings of that flight.
  if (pickerFrom !== null) {
    return render(
      <UnitPicker
        game={game()} pack={pack} before={before()} entry={entry} source={pickerFrom} warnings={flightWarnings(warnings, game(), pack, entry, pickerFrom)}
        onChange={() => undefined} onClose={() => undefined} onFly={() => undefined}
      />,
    );
  }
  return render(
    <TacticalEditor
      game={game()} pack={pack} entry={entry} before={before()} warnings={warnings} manualPayment={false}
      choosing={null} onChoose={() => undefined}
      onUpdate={() => undefined} onOpenPicker={() => undefined} onManualPayment={() => undefined} onOpenShop={() => undefined} onOpenBattle={() => undefined} onOpenFleet={() => undefined} onDone={() => undefined} onRemove={() => undefined}
    />,
  );
}

/** The heading of the block a warning stands in. */
const blockOf = (text: RegExp): string => {
  const block = screen.getByText(text).closest('.editor-section, .tactical-editor')!;
  return block.classList.contains('tactical-editor') ? 'outside' : block.querySelector('strong, summary')!.textContent!;
};
/** The row a warning stands right under, as the battle and the production do. */
const rowOf = (text: RegExp): string => screen.getByText(text).closest('ul')!.previousElementSibling!.textContent!;

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
    const blocked: Warning = { code: 'routeBlocked', params: { from: SOURCE, systemId: HOME } };
    const placer = placeWarnings([blocked, speed]);
    expect(placer.at('route', w => w.code === 'routeBlocked')).toEqual([blocked]);
    expect(placer.at('route')).toEqual([speed]);
  });

  test('the step of a warning decides its block; an override only where one step speaks to several blocks', () => {
    expect(placesOf(GROUP)).toEqual(['cargo']);
    expect(placesOf({ code: 'unitsMissing', params: {}, step: 'combat' })).toEqual(['battle']);
    expect(placesOf({ code: 'unitsMissing', params: {}, step: 'round' })).toEqual(['units']);
    expect(placesOf({ code: 'poolNegative', params: { pool: 'tactic' }, step: 'activation' })).toEqual(['system']);
    expect(placesOf({ code: 'poolNegative', params: {} })).toEqual(['tokens']);
    expect(placesOf({ code: 'capacitySystem', params: {}, step: 'combat' })).toEqual(['route', 'action', 'production']);
  });
});

describe('the strategy editor', () => {
  const noop = () => undefined;
  function card(warnings: Warning[], patch: Partial<CardEntry>) {
    const entry = { id: 'c', type: 'strategic', status: 'planned', ...patch } as CardEntry;
    return render(
      <StrategyEditor
        game={game()} pack={pack} round={game().plans[0].rounds[0]} entry={entry} before={before()} warnings={warnings} manualPayment={false} picking={null}
        onUpdate={noop} onManualPayment={noop} onPick={noop} onOpenShop={noop} onStartTactical={noop} onOpenTactical={noop} onDone={noop} onRemove={noop}
      />,
    );
  }
  const follows = (first: Element, second: Element) => (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

  test('what the mode and the card decide stands right under the cards, above their text', () => {
    const { container } = card([{ code: 'primaryRepeated', params: { held: 1 } }], { card: CARD.leadership });
    const warning = screen.getByText(/primary has already been played/);
    expect(follows(container.querySelector('.card-grid')!, warning)).toBe(true);
    expect(follows(warning, container.querySelector('.card-abilities')!)).toBe(true);
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
    <ExpeditionEditor game={game()} pack={pack} sliceId={sliceId} payment={{ planets: [], tradeGoods: 0 }} owners={{}} before={before()} warnings={warnings}
      manualPayment={false} onManualPayment={() => undefined} onChange={() => undefined} onDone={() => undefined} onRemove={() => undefined}
    />,
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

  test('with the flight step open the warning of its source stands in the step', () => {
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

  test('the fleet limit is the result of the whole action: it stands in its own block at the very end of the own part of the action', () => {
    const { container } = editor([FLEET, SHORT], { production: { fighter: 2 } });
    const result = screen.getByRole('group', { name: 'Action result' });
    expect(result).toHaveTextContent(/fleet pool/);
    expect(container.querySelector('.tactical-editor .editor-part')!.lastElementChild).toBe(result);
  });

  test('with ships chosen it is said in the sources too, where they are chosen', () => {
    const { container } = editor([FLEET]);
    const sections = [...container.querySelectorAll('.editor-section')].filter(s => s.textContent!.includes('fleet pool')).map(s => s.querySelector('strong')!.textContent);
    expect(sections).toEqual(['Sources', 'Action result']);
  });

  test('the capacity of the active system stands in the result alone: the landing under the sources changes it', () => {
    const over: Warning = { code: 'capacitySystem', params: { systemId: HOME, load: 5, capacity: 4 } };
    const left: Warning = { code: 'capacitySystem', params: { systemId: SOURCE, load: 3, capacity: 2 } };
    const { container } = editor([over, left]);
    const lines = (title: string) => [...container.querySelectorAll('.editor-section')].filter(s => s.querySelector('strong')?.textContent === title)
      .flatMap(s => [...s.querySelectorAll('.warning-text')].map(w => w.textContent));
    expect(lines('Sources')).toHaveLength(1);
    expect(lines('Sources')[0]).toMatch(/3 of 2/);
    expect(lines('Action result')).toHaveLength(2);
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

  test('no word about a space dock of its own: the domain\'s noProduction stands in the production block', () => {
    useGame.getState().setTile(SOURCE, '25');
    const { unmount } = render(
      <TacticalEditor
        game={game()} pack={pack} before={before()} warnings={[]} manualPayment={false} choosing={null} onChoose={() => undefined}
        entry={{ id: 'e', type: 'tactical', status: 'planned', systemId: SOURCE, moves: [], landings: [], production: { fighter: 1 }, payment: { planets: [], tradeGoods: 0 } } as unknown as TacticalEntry}
        onUpdate={() => undefined} onOpenPicker={() => undefined} onManualPayment={() => undefined} onOpenShop={() => undefined} onOpenBattle={() => undefined} onOpenFleet={() => undefined} onDone={() => undefined} onRemove={() => undefined}
      />,
    );
    expect(screen.queryByText(/with Production/)).toBeNull();
    unmount();
    render(
      <TacticalEditor
        game={game()} pack={pack} before={before()} warnings={[{ code: 'noProduction', params: { systemId: SOURCE } }]} manualPayment={false} choosing={null} onChoose={() => undefined}
        entry={{ id: 'e', type: 'tactical', status: 'planned', systemId: SOURCE, moves: [], landings: [], production: { fighter: 1 }, payment: { planets: [], tradeGoods: 0 } } as unknown as TacticalEntry}
        onUpdate={() => undefined} onOpenPicker={() => undefined} onManualPayment={() => undefined} onOpenShop={() => undefined} onOpenBattle={() => undefined} onOpenFleet={() => undefined} onDone={() => undefined} onRemove={() => undefined}
      />,
    );
    const warning = screen.getByText(/with Production/);
    expect(warning).toBeVisible();
    expect(rowOf(/with Production/)).toMatch(/^Production/);
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

  test('the activation speaks in the block of the system: no token left to spend, or one already there', () => {
    editor([{ code: 'poolNegative', params: { pool: 'tactic', have: -1 }, step: 'activation' }, { code: 'systemHasToken', params: { systemId: HOME } }]);
    expect(blockOf(/below zero/)).toMatch(/^Active system/);
    expect(blockOf(/already holds your token/)).toMatch(/^Active system/);
  });

  test('more lost in battle than there was stands in the battle', () => {
    editor([{ code: 'unitsMissing', params: { where: HOME, unit: 'cruiser', missing: 1 }, step: 'combat' }], { losses: { cruiser: 1 } });
    expect(rowOf(/missing 1/)).toMatch(/^Battle/);
  });
});

describe('the rest of an editor stands first', () => {
  test('in the adjustment the units stand in the system, anything else above the blocks', () => {
    const entry = { id: 'a', type: 'adjustment', status: 'planned', label: '', delta: {} } as Parameters<typeof AdjustmentEditor>[0]['entry'];
    const { container } = render(
      <AdjustmentEditor
        game={game()} pack={pack} entry={entry} picking={false} onPickSystem={() => undefined} onOpenHex={() => undefined} onUpdate={() => undefined} onDone={() => undefined} onRemove={() => undefined}
        warnings={[{ code: 'unitsMissing', params: { where: HOME, unit: 'cruiser', missing: 1 }, step: 'round' }, SHORT]}
      />,
    );
    expect(screen.getByRole('group', { name: 'System' })).toHaveTextContent(/Cruiser/);
    const rest = screen.getByText(/short by 2/);
    expect(rest.closest('.editor-section')).toBeNull();
    expect(rest.compareDocumentPosition(container.querySelector('.editor-section')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('in the expedition what no block takes stands above the parts', () => {
    const { container } = render(
      <ExpeditionEditor game={game()} pack={pack} sliceId={null} payment={{ planets: [], tradeGoods: 0 }} owners={{}} before={before()} warnings={[LANDING]}
        manualPayment={false} onManualPayment={() => undefined} onChange={() => undefined} onDone={() => undefined} onRemove={() => undefined}
      />,
    );
    expect(screen.getByText(/^Landing needs/).compareDocumentPosition(container.querySelector('.slice-grid')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('the steps of an action', () => {
  test('a flight says what the domain finds wrong with it: the cargo by the cargo, the rest by its start', () => {
    const entry = {
      id: 'e', type: 'tactical', status: 'planned', systemId: HOME, moves: [{ from: SOURCE, units: { infantry: 2 } }],
      landings: [], production: {}, payment: { planets: [], tradeGoods: 0 },
    } as unknown as TacticalEntry;
    const speed: Warning = { code: 'speedShort', params: { from: SOURCE, unit: 'carrier', move: 1, steps: 2 } };
    const { container } = render(<EntrySteps entry={entry} game={game()} pack={pack} before={before()} warnings={[GROUP, speed]} />);
    expect(container.querySelector('.stop-target')).toHaveTextContent(/capacity/i);
    expect(container.querySelector('.stop')).toHaveTextContent(/carrier/i);
    expect(container.querySelector('.stops')).toHaveClass('stops-over');
  });
});

describe('the list of warnings', () => {
  test('a free text wears the same mark as a warning of a block; in a row it leaves the mark to the row', () => {
    const { container } = render(<><WarningList message="Taken" /><WarningList variant="row" warnings={[SHORT]} game={game()} pack={pack} /></>);
    expect(screen.getByRole('status')).toHaveClass('warning-text', 'place-warnings');
    expect(container.querySelector('ul')).toHaveClass('warning-list');
    expect(container.querySelector('ul')).not.toHaveClass('place-warnings');
  });
});
