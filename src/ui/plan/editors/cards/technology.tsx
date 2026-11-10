import { researchCount } from '../../../../domain/strategy';
import type { CardBlocks } from './kit';
import { ResearchBlock } from '../../blocks/ResearchBlock';
import { Section } from '../../../primitives/Section';

/** The technologies come from the choice; the row of units stays as the quick way to a unit upgrade, and writes the same list. */
export const technologyBlocks: CardBlocks = ({ t, entry, effects, pack, primary, cost, change, placer, list, upgradeRow }) => {
  const count = researchCount(entry);
  const setResearched = (researched: string[]) => {
    const { researched: old, ...rest } = effects;
    void old;
    change({ effects: researched.length > 0 ? { ...rest, researched } : rest });
  };
  return (
    <>
      <ResearchBlock
        title={t('plan.strategy.research', { n: count })}
        note={t(primary ? 'plan.strategy.techPrimary' : 'plan.strategy.techSecondary', { n: cost.amount, count })}
        researched={effects.researched ?? []} player={entry.owner ?? 'me'} pack={pack} onChange={setResearched}
      />
      <Section title={t('plan.strategy.upgrades')} warnings={list(placer.at('research'))}>
        {upgradeRow}
      </Section>
    </>
  );
};
