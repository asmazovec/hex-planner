import { useTurn } from '../../../state/turnBridge';
import { TacticalEditor, type TacticalEditorProps } from './TacticalEditor';

/** The tactical editor over the turn of an entry of the open plan: it reads the turn and hands the changed turn to the store through the bridge. */
export function TacticalEditorHost({ entryId, ...props }: Omit<TacticalEditorProps, 'turn' | 'onChange'> & { entryId: string }) {
  const write = useTurn(props.view.table, entryId, props.pack);
  if (!write) return null;
  return <TacticalEditor {...props} turn={write.turn} onChange={write.update} />;
}
