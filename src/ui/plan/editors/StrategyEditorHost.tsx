import { useMemo } from 'react';
import { planOf } from '../../../game/fromLegacy';
import { useGame } from '../../../state/gameStore';
import { useTurn } from '../../../state/turnBridge';
import type { Plan } from '../../../domain/types';
import { StrategyEditor, type StrategyEditorProps } from './StrategyEditor';

/** The strategy editor over the turn of an entry of the open plan: it reads the turn and the round as the kernel keeps them, and hands the changed turn to the store through the bridge. */
export function StrategyEditorHost({ entryId, roundNumber, ...props }: Omit<StrategyEditorProps, 'turn' | 'onChange' | 'round'> & { entryId: string; roundNumber: number }) {
  const write = useTurn(props.view.table, entryId, props.pack);
  const game = useGame(s => s.game);
  const round = useMemo(() => {
    const plan = game?.plans.find(p => p.id === game.activePlanId) ?? game?.plans[0];
    return plan ? planOf(props.view.table, plan as Plan, props.pack).find(r => r.number === roundNumber) : undefined;
  }, [game, props.view.table, props.pack, roundNumber]);
  if (!write || !round) return null;
  return <StrategyEditor {...props} round={round} turn={write.turn} onChange={write.update} />;
}
