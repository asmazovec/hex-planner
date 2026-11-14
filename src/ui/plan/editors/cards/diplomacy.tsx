import { readyLimit } from '../../../../domain/strategy';
import { readyChoicesOn } from '../../../../game/edit/strategicRead';
import { shownPlanetValues } from '../../../../game/tile';
import type { CardBlocks } from './kit';
import { Section } from '../../../primitives/Section';

/** The planets to ready and their limit come from the domain; the replay warns past the limit, so a button is never disabled. */
export const diplomacyBlocks: CardBlocks = ({ t, table, board, pack, turn, player, entry, effects, primary, setEffects, placer, list, pickButton, toggled }) => {
  const limit = readyLimit(entry, table.expansions);
  const readied = effects.readied ?? [];
  const here = readyChoicesOn(table, board, pack, turn);
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
                {planet.name} {shownPlanetValues(table, board, pack, player, planet.id).resources}/{shownPlanetValues(table, board, pack, player, planet.id).influence}{board.planets[planet.id]?.exhausted ? ` · ${t('plan.strategy.exhausted')}` : ''}
              </button>
            ))}
          </div>
        </Section>
      )}
    </>
  );
};
