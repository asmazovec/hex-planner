/**
 * Sling Relay: "ACTION: Exhaust this card to produce 1 ship in any system that contains one of your space docks."
 *
 * Pass 2 makes it a `play`: the component action places the ship chosen (`choices.unit`) in the system chosen
 * (`choices.systemId`) and warns `noProduction` when that system holds none of my space docks; the ship is paid for
 * (ruling 1). The replay already exhausts the card. Today a hint.
 */
import { applyComponentProduction } from '../../../replay/production';
import type { Entry } from '../../../types';
import type { ComponentEffect } from '../../types';

export const id = 'technology:sr';

const SHIPS = ['carrier', 'cruiser', 'destroyer', 'dreadnought', 'fighter', 'flagship', 'warsun'];

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'systemId', kind: 'system' },
    { key: 'unit', kind: 'unit', options: () => SHIPS },
  ],
  play: ({ game, state, entry, pack, warnings, choices, held }) => {
    const systemId = String(choices.systemId ?? '');
    const unit = String(choices.unit ?? '');
    if (!held || entry.type !== 'component' || !systemId || !unit || entry.effects?.production) return;
    // The production of the card is the production of a component's entry: checked as a system's, placed, paid for.
    const made: Extract<Entry, { type: 'component' }> = { ...entry, effects: { ...entry.effects, production: { systemId, units: { [unit]: 1 } } } };
    applyComponentProduction(game, state, made, pack, warnings);
  },
};
