import { shownPlanetValues } from '../../../../domain/payment';
import { readyChoices, readyLimit } from '../../../../domain/strategy';
import type { CardBlocks } from './kit';
import { Section } from '../../../primitives/Section';

/** The planets to ready and their limit come from the domain; the replay warns past the limit, so a button is never disabled. */
export const diplomacyBlocks: CardBlocks = ({ t, game, pack, entry, before, effects, primary, setEffects, placer, list, pickButton, toggled }) => {
  const limit = readyLimit(entry, game.expansions);
  const readied = effects.readied ?? [];
  const here = readyChoices(game, entry, before, pack);
  return (
    <>
      {primary && pickButton('system', t('plan.strategy.systemPrimary'), effects.systemId)}
      {primary && list(placer.at('system'))}
      {limit !== null && here.length === 0 && <p className="muted">{t('plan.strategy.noExhausted')}</p>}
      {here.length > 0 && (
        <Section label={t('plan.strategy.ready')} title={t(limit === null ? 'plan.strategy.ready' : 'plan.strategy.readyTwo')} warnings={list(placer.at('ready'))}>
          <div className="pay-planets">
            {here.map(planet => (
              <button
                key={planet.id} type="button" aria-pressed={readied.includes(planet.id)}
                onClick={() => setEffects({ readied: toggled(readied, planet.id) })}
              >
                {planet.name} {shownPlanetValues(pack, before, planet.id, game.faction).resources}/{shownPlanetValues(pack, before, planet.id, game.faction).influence}{before.exhausted.includes(planet.id) ? ` · ${t('plan.strategy.exhausted')}` : ''}
              </button>
            ))}
          </div>
        </Section>
      )}
    </>
  );
};
