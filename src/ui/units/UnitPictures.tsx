import { useTranslation } from 'react-i18next';
import type { UnitCounts } from '../../domain/types';
import { UnitTile } from './UnitTile';
import { UNIT_ORDER } from './unitOrder';

/** The units of a count as small pictures in the colour of their player, in the order of the unit sheet. */
export function UnitPictures({ units, colour }: { units: UnitCounts; colour: string }) {
  const { t } = useTranslation();
  return (
    <span className="upics">
      {UNIT_ORDER.filter(u => (units[u] ?? 0) > 0).map(unit => (
        <UnitTile key={unit} variant="mini" kind={unit} colour={colour} count={units[unit] ?? 0} label={t(`unit.${unit}`)} />
      ))}
    </span>
  );
}
