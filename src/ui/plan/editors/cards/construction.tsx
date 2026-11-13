import type { CardBlocks } from './kit';

export const constructionBlocks: CardBlocks = ({ t, game, pack, effects, primary, te, placer, list, pickButton, tile, builtLine, onOpenShop }) => {
  const production = effects.production;
  return (
    <>
      {pickButton('build', t(primary ? 'plan.strategy.buildPrimary' : 'plan.strategy.buildSecondary'), effects.systemId)}
      {list(placer.at('system'))}
      {(effects.structures?.length ?? 0) > 0 && (
        <p className="muted">
          {t('plan.strategy.built', {
            list: effects.structures?.map(s => `${t(s.kind === 'pds' ? 'map.pds' : 'map.spaceDock')} (${pack.planets[s.planetId]?.name ?? s.planetId})`).join(', '),
          })}
        </p>
      )}
      {/* Hecatoncheires: a mech and an infantry stand instead of a PDS (the secondary). */}
      {!primary && game.faction === 'titans' && (
        <button
          type="button" className="option" aria-pressed={production !== undefined} disabled={effects.systemId === undefined}
          onClick={() => { if (effects.systemId) onOpenShop(effects.systemId, 'units'); }}
        >
          {t('plan.strategy.mechInstead')}
        </button>
      )}
      {te && (production
        ? <button type="button" className="option" aria-pressed="true" onClick={() => onOpenShop(production.systemId, 'units')}>{t('plan.strategy.dock')} · {tile(production.systemId)}</button>
        : primary && pickButton('dock', t('plan.strategy.dock')))}
      {builtLine}
      {list(placer.at('production'))}
    </>
  );
};
