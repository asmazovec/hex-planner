import type { CardBlocks } from './kit';

export const constructionBlocks: CardBlocks = ({ t, pack, effects, primary, te, placer, list, pickButton, tile, builtLine, onOpenShop }) => {
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
      {te && (production
        ? <button type="button" className="option" aria-pressed="true" onClick={() => onOpenShop(production.systemId, 'units')}>{t('plan.strategy.dock')} · {tile(production.systemId)}</button>
        : primary && pickButton('dock', t('plan.strategy.dock')))}
      {builtLine}
      {list(placer.at('production'))}
    </>
  );
};
