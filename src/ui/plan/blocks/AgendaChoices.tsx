import { useTranslation } from 'react-i18next';
import { strategyCards } from '../../../data/loadPack';
import { componentById } from '../../../domain/components';
import { playersOf } from '../../../domain/players';
import type { ComponentDef, DataPack, Game } from '../../../domain/types';
import { Section } from '../../primitives/Section';

type Choices = Record<string, string>;

export interface AgendaChoicesProps {
  game: Game;
  pack: DataPack;
  /** The agenda the entry resolved. */
  agenda: ComponentDef;
  choices: Record<string, string | number> | undefined;
  /** The laws in play just before the entry, for an agenda that elects one. */
  laws?: string[];
  /** The choices after the press; without a value when none is left. */
  onChange: (choices: Choices | undefined) => void;
}

/** The planets of the systems on the map, by name. */
const planetsOnMap = (game: Game, pack: DataPack): { id: string; name: string }[] =>
  [...new Set(Object.values(game.map).flatMap(tile => pack.tiles[tile.split('@')[0]]?.planetIds ?? []))]
    .flatMap(id => (pack.planets[id] ? [{ id, name: pack.planets[id].name }] : []));

/**
 * How an agenda was resolved, by what its card asks (its target): For or Against, and what was elected: a player, a
 * planet, a strategy card or a law in play. The choice stands in the entry's `choices` (`outcome`, `elect`, `card`) for
 * the replay to read: a law resolved against does not stay in play, an elected player is bound by their law, an elected
 * planet carries it. Pressing the chosen button again takes the choice back.
 */
export function AgendaChoices({ game, pack, agenda, choices, laws = [], onChange }: AgendaChoicesProps) {
  const { t } = useTranslation();
  const target = String(agenda.detail?.target ?? '');
  const set = (key: string, value: string) => {
    const next: Choices = Object.fromEntries(Object.entries(choices ?? {}).map(([name, was]) => [name, String(was)]));
    if (next[key] === value) delete next[key];
    else next[key] = value;
    onChange(Object.keys(next).length > 0 ? next : undefined);
  };
  const choose = (key: string, title: string, options: { value: string; name: string }[]) => (
    <Section label={title} title={title}>
      <div className="pay-planets">
        {options.map(option => (
          <button key={option.value} type="button" aria-pressed={String(choices?.[key]) === option.value} onClick={() => set(key, option.value)}>
            {t('plan.agenda.elect', { name: option.name })}
          </button>
        ))}
      </div>
    </Section>
  );
  return (
    <>
      {target.startsWith('For/Against') && (
        <Section label={t('plan.agenda.outcome')} title={t('plan.agenda.outcome')}>
          <div className="pay-planets">
            {(['for', 'against'] as const).map(outcome => (
              <button key={outcome} type="button" aria-pressed={choices?.outcome === outcome} onClick={() => set('outcome', outcome)}>{t(`plan.agenda.${outcome}`)}</button>
            ))}
          </div>
        </Section>
      )}
      {target.startsWith('Elect Player') && choose('elect', t('plan.agenda.electPlayer'), playersOf(game).map(player => ({ value: player.id, name: pack.factions[player.faction]?.name ?? player.faction })))}
      {/^Elect (Non-Home )?Planet/.test(target) && choose('elect', t('plan.agenda.electPlanet'), planetsOnMap(game, pack).map(planet => ({ value: planet.id, name: planet.name })))}
      {target.startsWith('Elect Strategy Card') && choose('card', t('plan.agenda.electCard'), strategyCards(game.expansions).map(card => ({ value: String(card.initiative), name: card.name })))}
      {target.startsWith('Elect Law') && choose('elect', t('plan.agenda.electLaw'), laws.flatMap(id => componentById(pack, id) ?? []).map(law => ({ value: law.id, name: law.name })))}
    </>
  );
}
