import type { TokenKind } from '../../domain/hexLayout';
import { UNIT_ART } from './unitArt';

/**
 * The one place the player cards draw a unit. Decorative: the name stands beside it. Takes the colour of the text around
 * it through `.unit-icon` in the theme, so a later set of icons replaces only this component.
 */
export function UnitIcon({ unit }: { unit: TokenKind }) {
  const { cx, cy, r, paths } = UNIT_ART[unit];
  return (
    <svg className="unit-icon" viewBox={`${cx - r} ${cy - r} ${2 * r} ${2 * r}`} fill="currentColor" aria-hidden="true">
      {paths.map(d => <path key={d} d={d} />)}
    </svg>
  );
}
