import { useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import { blur, choose, effective, flightLoop, flights, maxSaving, motion, type Preference } from '../common/preferences';
import { SectionTitle } from '../primitives/SectionTitle';

/**
 * Each item that costs the battery, turned off on its own, and maximum saving in the same row: while it is on, the
 * items are off and locked, and they come back as they were when it is turned off.
 */
export function EnergySettings() {
  const { t } = useTranslation();
  // The choices live in storage; a change draws them again.
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  const max = maxSaving.read();
  const chip = (setting: Preference, label: string, pressed: boolean, disabled = false) => (
    <button type="button" className="chip" aria-pressed={pressed} disabled={disabled} onClick={() => { choose(setting, !setting.read()); redraw(); }}>
      {label}
    </button>
  );
  return (
    <div className="side-group energy-settings">
      <SectionTitle as="p" className="side-label" id="energy-label">{t('game.energy')}</SectionTitle>
      <div className="chips" role="group" aria-labelledby="energy-label">
        {chip(maxSaving, t('game.saveAll'), max)}
        {chip(flights, t('game.flights'), effective(flights), max)}
        {chip(flightLoop, t('game.flightLoop'), effective(flightLoop) && flights.read(), max || !flights.read())}
        {chip(motion, t('game.motion'), effective(motion), max)}
        {chip(blur, t('game.blur'), effective(blur), max)}
      </div>
      <p className="side-note">{t(max ? 'game.energyMaxNote' : 'game.energyNote')}</p>
    </div>
  );
}
