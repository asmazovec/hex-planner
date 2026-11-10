import { researchCount } from '../../../../domain/strategy';
import type { CardBlocks } from './kit';
import { Section } from '../../../primitives/Section';

export const technologyBlocks: CardBlocks = ({ t, entry, primary, cost, placer, list, upgradeRow }) => {
  const count = researchCount(entry);
  return (
    <>
      <Section title={t('plan.strategy.research', { n: count })}>
        <span className="muted">{t(primary ? 'plan.strategy.techPrimary' : 'plan.strategy.techSecondary', { n: cost.amount, count })}</span>
      </Section>
      <Section title={t('plan.strategy.upgrades')} warnings={list(placer.at('research'))}>
        {upgradeRow}
      </Section>
    </>
  );
};
