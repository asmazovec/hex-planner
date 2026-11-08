import { homeSlot } from '../../../../domain/strategy';
import type { TacticalEntry } from '../../tactical';
import type { CardBlocks } from './kit';

export const warfareBlocks: CardBlocks = ({ t, game, pack, round, entry, effects, primary, te, placer, list, tokenPick, pickButton, tile, builtLine, onOpenShop, onStartTactical, onOpenTactical }) => {
  if (primary) {
    if (!te) {
      return (
        <>
          {pickButton('system', t('plan.strategy.liftToken'), effects.systemId)}
          {tokenPick(true)}
        </>
      );
    }
    const tactical = round.entries.find((e): e is typeof e & TacticalEntry => e.type === 'tactical' && e.fromCard === entry.id);
    return (
      <>
        {tactical
          ? (
            <button type="button" className="option" aria-pressed="true" onClick={() => onOpenTactical(tactical.id)}>
              {t('plan.strategy.freeTacticalOpen')}{tactical.systemId ? ` · ${tile(tactical.systemId)}` : ''}
            </button>
          )
          : <button type="button" className="option" onClick={onStartTactical}>{t('plan.strategy.freeTactical')}</button>}
        <p className="muted">{t('plan.strategy.freeTacticalNote')}</p>
        {tokenPick(true)}
      </>
    );
  }
  const home = homeSlot(game, pack);
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
