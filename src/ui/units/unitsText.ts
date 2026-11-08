import type { UnitCounts } from '../../domain/types';
import { UNIT_ORDER } from './unitOrder';

/**
 * Units as a line of text in the order of the shop: "Carrier 1, Infantry 2". Signed, a change reads "Infantry +2,
 * Fighter -1" and negative counts are kept.
 */
export function unitsText(units: UnitCounts, t: (key: string) => string, signed = false): string {
  return UNIT_ORDER
    .filter(u => (signed ? Boolean(units[u]) : (units[u] ?? 0) > 0))
    .map(u => `${t(`unit.${u}`)} ${signed && (units[u] ?? 0) > 0 ? '+' : ''}${units[u]}`)
    .join(', ');
}
