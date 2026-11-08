import type { CardBlocks } from './kit';
import { Section } from '../../../primitives/Section';
import { PlayerChoice } from '../../../primitives/player';

export const tradeBlocks: CardBlocks = ({ t, effects, primary, setEffects, opponents, named, toggled }) => {
  if (!primary) return <p className="muted">{t('plan.strategy.tradeSecondary')}</p>;
  return (
    <>
      <p className="muted">{t('plan.strategy.tradePrimary')}</p>
      <Section label={t('plan.strategy.free')} title={t('plan.strategy.free')}>
        <PlayerChoice
          buttonClassName="option" options={opponents.map(o => ({ value: o.id, label: named(o.id), color: o.color }))}
          chosen={id => (id !== null && effects.freeSecondary?.includes(id)) ?? false}
          onPick={id => { if (id !== null) setEffects({ freeSecondary: toggled(effects.freeSecondary, id) }); }}
        />
      </Section>
    </>
  );
};
