import { controlsMecatolOn } from '../../../../game/edit/strategicRead';
import type { CardBlocks } from './kit';

/** The point follows control of Mecatol Rex before the entry: the replay counts it, the editor only says so. */
export const imperialBlocks: CardBlocks = ({ t, board, player, primary }) => {
  if (!primary) return <p className="muted">{t('plan.strategy.imperialSecondary')}</p>;
  return (
    <>
      <p>{t(controlsMecatolOn(board, player) ? 'plan.strategy.mecatol' : 'plan.strategy.mecatolNone')}</p>
      <p className="muted">{t('plan.strategy.imperialNote')}</p>
    </>
  );
};
