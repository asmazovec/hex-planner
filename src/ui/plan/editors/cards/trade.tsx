import type { CardBlocks } from './kit';
import { Section } from '../../../primitives/Section';
import { PlayerChoice } from '../../../primitives/player';

export const tradeBlocks: CardBlocks = kit => {
  const { t, effects, primary, setEffects, toggled } = kit;
  if (!primary) return <p className="muted">{t('plan.strategy.tradeSecondary')}</p>;
  return (
    <>
      <p className="muted">{t('plan.strategy.tradePrimary')}</p>
      <Section title={t('plan.strategy.free')}>
        <PlayerChoice
          label={t('plan.strategy.free')} options={kit.others}
          chosen={id => (id !== null && effects.freeSecondary?.includes(id)) ?? false}
          onPick={id => { if (id !== null) setEffects({ freeSecondary: toggled(effects.freeSecondary, id) }); }}
        />
      </Section>
    </>
  );
};
