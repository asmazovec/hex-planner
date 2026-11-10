import { researchCount } from '../../../../domain/strategy';
import type { CardBlocks } from './kit';
import { ResearchBlock } from '../../blocks/ResearchBlock';
import { Section } from '../../../primitives/Section';

/**
 * The technologies come from the choice; the row of units stays as the quick way to a unit upgrade, and writes the same
 * list. The row stands first: a tap on it adds a card to the list, and a list above would push the row from under the finger.
 */
export const technologyBlocks: CardBlocks = ({ t, entry, effects, pack, primary, cost, change, placer, list, upgradeRow }) => {
  const count = researchCount(entry);
  const setResearched = (researched: string[]) => {
    const { researched: old, ...rest } = effects;
    void old;
    change({ effects: researched.length > 0 ? { ...rest, researched } : rest });
  };
  return (
    <>
      <Section title={t('plan.strategy.upgrades')}>
        {upgradeRow}
      </Section>
      <ResearchBlock
        title={t('plan.strategy.research', { n: count })}
        note={t(primary ? 'plan.strategy.techPrimary' : 'plan.strategy.techSecondary', { n: cost.amount, count })}
        researched={effects.researched ?? []} player={entry.owner ?? 'me'} pack={pack} onChange={setResearched}
        warnings={list(placer.at('research'))}
      />
    </>
  );
};
