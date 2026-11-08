import { researchCount } from '../../../../domain/strategy';
import type { CardBlocks } from './kit';
import { Section } from '../../../primitives/Section';
import { Stepper } from '../../../primitives/Stepper';

export const technologyBlocks: CardBlocks = ({ t, entry, effects, primary, cost, change, placer, list, upgradeRow }) => {
  const count = researchCount(entry);
  const setResearched = (value: number) => {
    const next = { ...effects };
    if (value > 0) next.researched = value;
    else delete next.researched;
    change({ effects: next });
  };
  return (
    <>
      <Section title={t('plan.strategy.research', { n: count })}>
        <Stepper name={t('plan.strategy.researched')} value={effects.researched ?? 0} min={0} onChange={setResearched} />
        <span className="muted">{t(primary ? 'plan.strategy.techPrimary' : 'plan.strategy.techSecondary', { n: cost.amount, count })}</span>
      </Section>
      <Section title={t('plan.strategy.upgrades')} warnings={list(placer.at('research'))}>
        {upgradeRow}
      </Section>
    </>
  );
};
