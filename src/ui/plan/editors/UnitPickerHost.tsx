import type { Warning } from '../../../domain/types';
import { atOf } from '../../../game/edit/tacticalRead';
import { useTurn } from '../../../state/turnBridge';
import { flightWarnings, UnitPicker, type UnitPickerProps } from './UnitPicker';

/** The flight step over the turn of an entry of the open plan: the warnings of the entry are cut to this flight here, the changed turn goes to the store through the bridge. */
export function UnitPickerHost({ entryId, warnings, ...props }: Omit<UnitPickerProps, 'turn' | 'onChange' | 'warnings'> & { entryId: string; warnings: Warning[] }) {
  const write = useTurn(props.view.table, entryId, props.pack);
  if (!write) return null;
  const { table, board } = props.view;
  return <UnitPicker {...props} turn={write.turn} onChange={write.update} warnings={flightWarnings(warnings, atOf(table, board, props.pack).map, props.pack, write.turn, props.source)} />;
}
