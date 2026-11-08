import type { CardBlocks } from './kit';
import { Section } from '../../../primitives/Section';

export const politicsBlocks: CardBlocks = ({ t, effects, primary, setEffects, opponents, named }) => (
  <>
    {primary && (
      <Section label={t('plan.strategy.speaker')} title={t('plan.strategy.speaker')}>
        {/* TODO(P2-329) #ws:ui-containers #type:ui #player-choice #needs:prototype — выбор игрока (точка цвета + имя, inline var(--player-…)) собран руками здесь, в Trade ниже, в HexStage и PlanScreen; общий PlayerChoice с PlayerDot */}
        {opponents.map(o => (
          <button
            key={o.id} type="button" className="option" aria-pressed={effects.speaker === o.id}
            onClick={() => setEffects({ speaker: effects.speaker === o.id ? undefined : o.id })}
          >
            <span className="owner-dot" aria-hidden="true" style={{ background: `var(--player-${o.color})` }} />
            {named(o.id)}
          </button>
        ))}
      </Section>
    )}
    <p className="muted">{t(primary ? 'plan.strategy.politicsPrimary' : 'plan.strategy.politicsSecondary')}</p>
  </>
);
