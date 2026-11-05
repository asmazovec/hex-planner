import type { UnitId } from '../../domain/types';
import { UnitGlyph } from '../map/UnitGlyph';

/**
 * The one place the player cards draw a unit. Decorative: the name stands beside it. Takes the colour of the text around
 * it through `.unit-icon` in the theme, so a later set of icons replaces only this component.
 */
export function UnitIcon({ unit }: { unit: UnitId }) {
  return (
    <svg className="unit-icon" viewBox="-13 -9.5 26 19" aria-hidden="true">
      <UnitGlyph unit={unit} owner="me" count={1} label="" scale={1} />
    </svg>
  );
}
