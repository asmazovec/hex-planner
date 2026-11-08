import { controlsMecatol } from '../../../../domain/strategy';
import type { CardBlocks } from './kit';

/** The point follows control of Mecatol Rex before the entry: the replay counts it, the editor only says so. */
export const imperialBlocks: CardBlocks = ({ t, before, primary }) => {
  if (!primary) return <p className="muted">{t('plan.strategy.imperialSecondary')}</p>;
  return (
    <>
      <p>{t(controlsMecatol(before) ? 'plan.strategy.mecatol' : 'plan.strategy.mecatolNone')}</p>
      <p className="muted">{t('plan.strategy.imperialNote')}</p>
    </>
  );
};
