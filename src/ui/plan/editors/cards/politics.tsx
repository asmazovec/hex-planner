import type { CardBlocks } from './kit';
import { Section } from '../../../primitives/Section';
import { PlayerChoice } from '../../../primitives/player';

export const politicsBlocks: CardBlocks = kit => {
  const { t, effects, primary, setEffects } = kit;
  return (
    <>
      {primary && (
        <Section title={t('plan.strategy.speaker')}>
          <PlayerChoice
            label={t('plan.strategy.speaker')} options={kit.others} chosen={id => effects.speaker === id}
            onPick={id => setEffects({ speaker: id === null || effects.speaker === id ? undefined : id })}
          />
        </Section>
      )}
      <p className="muted">{t(primary ? 'plan.strategy.politicsPrimary' : 'plan.strategy.politicsSecondary')}</p>
    </>
  );
};
