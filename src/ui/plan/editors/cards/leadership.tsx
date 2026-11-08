import { withLeadershipTokens } from '../../../../domain/strategy';
import type { CardBlocks } from './kit';

export const leadershipBlocks: CardBlocks = ({ t, effects, primary, cost, change, tokenPick }) => {
  const bought = effects.boughtTokens ?? 0;
  return (
    <>
      {tokenPick(false, tokens => change({ effects: withLeadershipTokens(effects, tokens, primary) }))}
      <p className="muted">{bought > 0 ? t('plan.strategy.bought', { n: bought, cost: cost.amount }) : t(primary ? 'plan.strategy.boughtNonePrimary' : 'plan.strategy.boughtNoneSecondary')}</p>
    </>
  );
};
