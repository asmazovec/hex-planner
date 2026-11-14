import { cleanup, render, screen } from '@testing-library/react';
import { kernelViewOf } from '../testing/view';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import type { AnyWarningCode } from '../../domain/types';
import { createGame } from '../../testing/old/domain/newGame';
import { setLanguage } from '../../i18n';
import { WarningText } from './WarningText';

const pack = loadPack(['pok']);
const game = createGame({ expansions: ['pok'], playerCount: 6, faction: 'arborec' }, pack);

beforeEach(() => setLanguage('ru'));
afterEach(() => { cleanup(); setLanguage('en'); });

describe('a warning is worded in the language of the interface, its params stay as the domain writes them', () => {
  test('the colours of missing prerequisites are named in Russian, not by the raw colour id', () => {
    render(<WarningText {...kernelViewOf(game, pack)} pack={pack} warning={{ code: 'prerequisitesMissing' as AnyWarningCode, params: { id: 'technology:ast', name: 'Aetherstream', missing: 1, symbols: 'propulsion ×1, biotic ×2' } }} />);
    const text = screen.getByText(/Aetherstream/).textContent!;
    expect(text).not.toMatch(/propulsion|biotic/);
    expect(text).toContain('Двигатели ×1');
    expect(text).toContain('Биотех ×2');
  });

  test('a unit name does not agree with a participle: the landing warning names the unit after a colon', () => {
    render(<WarningText {...kernelViewOf(game, pack)} pack={pack} warning={{ code: 'landingFromPlanet' as AnyWarningCode, params: { unit: 'infantry', from: Object.keys(pack.planets)[0] } }} />);
    expect(screen.getByText(/взято: Пехота/)).toBeTruthy();
  });
});
