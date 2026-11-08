import { researchCount } from '../../../../domain/strategy';
import type { CardBlocks } from './kit';
import { Section } from '../../../primitives/Section';

export const technologyBlocks: CardBlocks = ({ t, entry, effects, primary, cost, change, placer, list, upgradeRow }) => {
  const count = researchCount(entry);
  const researched = effects.researched ?? 0;
  const setResearched = (value: number) => {
    const next = { ...effects };
    if (value > 0) next.researched = value;
    else delete next.researched;
    change({ effects: next });
  };
  return (
    <>
      <Section title={t('plan.strategy.research', { n: count })}>
        <div className="research-row in-card">
          <button type="button" className="option" aria-pressed={researched > 0} onClick={() => setResearched(researched + 1)}>
            {t('plan.strategy.researchAdd')}{researched > 0 ? ` · ${researched}` : ''}
          </button>
          {/* TODO(P2-332) #ws:ui-containers #type:ui #needs:prototype #size:s — «−» на месте .in-card, где по соглашению удаление, а делает уменьшение; Stepper */}
          {researched > 0 && <button type="button" aria-label={t('plan.strategy.researchTake')} onClick={() => setResearched(researched - 1)}>−</button>}
        </div>
        <span className="muted">{t(primary ? 'plan.strategy.techPrimary' : 'plan.strategy.techSecondary', { n: cost.amount, count })}</span>
      </Section>
      <Section title={t('plan.strategy.upgrades')} warnings={list(placer.at('research'))}>
        {upgradeRow}
      </Section>
    </>
  );
};
