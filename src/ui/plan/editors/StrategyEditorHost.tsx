import { useMemo } from 'react';
import { useGame } from '../../../state/gameStore';
import { useTurn } from '../../../state/turnBridge';
import { StrategyEditor, type StrategyEditorProps } from './StrategyEditor';

/** The strategy editor over the turn of an entry of the open plan: it reads the turn and the round as the kernel keeps them, and hands the changed turn to the store through the bridge. */
export function StrategyEditorHost({ entryId, roundNumber, ...props }: Omit<StrategyEditorProps, 'turn' | 'onChange' | 'round'> & { entryId: string; roundNumber: number }) {
  const write = useTurn(props.view.table, entryId, props.pack);
  const saved = useGame(s => s.saved);
  const round = useMemo(() => {
    const plan = saved?.plans.find(p => p.id === saved.activePlanId) ?? saved?.plans[0];
    return plan?.rounds.find(r => r.number === roundNumber);
  }, [saved, roundNumber]);
  if (!write || !round) return null;
  return <StrategyEditor {...props} round={round} turn={write.turn} onChange={write.update} />;
}
