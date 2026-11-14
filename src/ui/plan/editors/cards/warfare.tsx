import type { Tactical } from '../../../../game/actions';
import { homeSlotOn } from '../../../../game/edit/strategicRead';
import type { CardBlocks } from './kit';

export const warfareBlocks: CardBlocks = ({ t, table, pack, player, turn, effects, primary, te, placer, list, tokenPick, pickButton, tile, builtLine, onOpenShop, onStartTactical, onOpenTactical }) => {
  if (primary) {
    if (!te) {
      return (
        <>
          {pickButton('system', t('plan.strategy.liftToken'), effects.systemId)}
          {tokenPick(true)}
        </>
      );
    }
    // The free action stands inside the card; the bridge makes and drops it.
    const tactical = turn.action.kind === 'strategic' ? turn.action.nested?.find(nested => nested.action.kind === 'tactical') : undefined;
    const system = tactical ? (tactical.action as Tactical).system : null;
    return (
      <>
        {tactical
          ? (
            <button type="button" className="option" aria-pressed="true" onClick={() => onOpenTactical(tactical.id)}>
              {t('plan.strategy.freeTacticalOpen')}{system ? ` · ${tile(system)}` : ''}
            </button>
          )
          : <button type="button" className="option" onClick={onStartTactical}>{t('plan.strategy.freeTactical')}</button>}
        <p className="muted">{t('plan.strategy.freeTacticalNote')}</p>
        {tokenPick(true)}
      </>
    );
  }
  const home = homeSlotOn(table, pack, player);
  return (
    <>
      <button
        type="button" className="option" aria-pressed={effects.production !== undefined} disabled={home === null}
        onClick={() => { if (home) onOpenShop(home, 'units'); }}
      >
        {t('plan.strategy.homeProduction')}
      </button>
      {builtLine}
      {list(placer.at('production'))}
      <p className="muted">{t(home === null ? 'plan.strategy.noHome' : 'plan.strategy.shopNote')}</p>
    </>
  );
};
