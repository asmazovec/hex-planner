import { useTranslation } from 'react-i18next';
import { researchTokensGiven } from '../../../../domain/replay/research';
import { techSlicePlanets } from '../../../../domain/payment';
import { researchCount, researchLimit } from '../../../../domain/strategy';
import type { DataPack } from '../../../../domain/types';
import type { CardBlocks } from './kit';
import { ResearchBlock } from '../../blocks/ResearchBlock';
import { Section } from '../../../primitives/Section';

/**
 * The technologies come from the choice; the row of units stays as the quick way to a unit upgrade, and writes the same
 * list. The row stands first: a tap on it adds a card to the list, and a list above would push the row from under the finger.
 * Planets with a technology specialty stand after the technologies: pressing one exhausts it for a prerequisite (90.14).
 */
export const technologyBlocks: CardBlocks = ({ t, game, entry, effects, before, pack, cost, change, placer, list, upgradeRow, tokenPick }) => {
  const count = researchCount(entry);
  const setResearched = (researched: string[]) => {
    const { researched: old, ...rest } = effects;
    void old;
    change({ effects: researched.length > 0 ? { ...rest, researched } : rest });
  };
  const chosen = effects.specialties ?? [];
  const planets = [...new Set([...techSlicePlanets(before, pack), ...chosen])];
  const toggle = (id: string) => {
    const next = chosen.includes(id) ? chosen.filter(other => other !== id) : [...chosen, id];
    const { specialties: old, ...rest } = effects;
    void old;
    change({ effects: next.length > 0 ? { ...rest, specialties: next } : rest });
  };
  return (
    <>
      <Section title={t('plan.strategy.upgrades')}>
        {upgradeRow}
      </Section>
      <ResearchBlock
        title={t('plan.strategy.research', { n: count })}
        note={t(researchLimit(entry, before.holdings, { pack, faction: game.faction }) === 2 ? 'plan.strategy.techPrimary' : 'plan.strategy.techSecondary', { n: cost.amount, count })}
        researched={effects.researched ?? []} player={entry.owner ?? 'me'} pack={pack} onChange={setResearched}
        warnings={list(placer.at('research'))}
      />
      {/* A component that turns a research into tokens (Propagation): the card gives them to distribute. */}
      {researchTokensGiven(pack, game, before, before, effects.researched) > 0 && tokenPick()}
      {planets.length > 0 && <Specialties planets={planets} chosen={chosen} pack={pack} onToggle={toggle} />}
    </>
  );
};

function Specialties({ planets, chosen, pack, onToggle }: { planets: string[]; chosen: string[]; pack: DataPack; onToggle: (id: string) => void }) {
  const { t } = useTranslation();
  return (
    <Section title={t('plan.strategy.specialties')}>
      <span className="muted">{t('plan.strategy.specialtiesNote')}</span>
      <div className="pay-planets" role="group" aria-label={t('plan.strategy.specialties')}>
        {planets.map(id => (
          <button key={id} type="button" aria-pressed={chosen.includes(id)} onClick={() => onToggle(id)}>
            {`${pack.planets[id]?.name ?? id} ${(pack.planets[id]?.tech ?? []).join(', ')}`}
          </button>
        ))}
      </div>
    </Section>
  );
}
