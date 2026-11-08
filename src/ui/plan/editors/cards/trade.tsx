import type { CardBlocks } from './kit';

export const tradeBlocks: CardBlocks = ({ t, effects, primary, setEffects, opponents, named, toggled }) => {
  if (!primary) return <p className="muted">{t('plan.strategy.tradeSecondary')}</p>;
  return (
    <>
      <p className="muted">{t('plan.strategy.tradePrimary')}</p>
      <div className="editor-section" role="group" aria-label={t('plan.strategy.free')}>
        <strong>{t('plan.strategy.free')}</strong>
        {/* TODO(P2-330) #ws:ui-containers #type:ui #size:s #player-choice #dep:P2-329 #dep:P2-328 — вторая ручная сборка выбора игрока; PlayerChoice */}
        {opponents.map(o => (
          <button
            key={o.id} type="button" className="option" aria-pressed={effects.freeSecondary?.includes(o.id) ?? false}
            onClick={() => setEffects({ freeSecondary: toggled(effects.freeSecondary, o.id) })}
          >
            <span className="owner-dot" aria-hidden="true" style={{ background: `var(--player-${o.color})` }} />
            {named(o.id)}
          </button>
        ))}
      </div>
    </>
  );
};
