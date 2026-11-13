import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { componentById } from '../../../domain/components';
import { choicesFor, optionsOf, shownChoices } from '../../../domain/effects/choices';
import { effectOf } from '../../../domain/effects/registry';
import type { ChoiceContext, ChoiceSlot, ChoiceSpec } from '../../../domain/effects/types';
import { systemNameOf } from '../../../domain/systemName';
import type { DataPack, Entry, Game, GameState } from '../../../domain/types';
import { opponentShortName, shortName } from '../../players/names';
import { ComponentPicker } from '../../components/ComponentPicker';
import { playerStyle } from '../../primitives/player';
import { Section } from '../../primitives/Section';
import { Stepper } from '../../primitives/Stepper';
import { ComponentSlot } from './ComponentSlot';

/** More candidates than this are not laid out as buttons: a component is found through the picker. */
const MANY = 12;

export interface ChoicesBlockProps {
  /** The component whose choices these are: the entry's component action or one of its `uses`. */
  id: string;
  entry: Entry;
  game: Game;
  pack: DataPack;
  /** The state of the entry's owner just before it. */
  before?: GameState;
  /** My state, which holds the laws and the objectives; the same as `before` for my own entry. */
  shared?: GameState;
  /** The choices as they stand after the press; empty when none is left. */
  onChange: (chosen: Record<string, string | number>) => void;
}

/**
 * What a played component asks the player to choose (`ComponentEffect.choose`): a group named after the component,
 * and in it one row for each thing asked, its candidates as buttons (a stepper for a number). A press on the chosen one
 * takes it back. Nothing is forbidden: the effect warns of a value it cannot use. Draws nothing for a component that asks nothing.
 */
export function ChoicesBlock({ id, entry, game, pack, before, shared, onChange }: ChoicesBlockProps) {
  const { t, i18n } = useTranslation();
  const specs = effectOf(pack, id)?.choose;
  const def = componentById(pack, id);
  if (!specs || specs.length === 0 || !def || !before) return null;
  const chosen = choicesFor(entry, id);
  const owner = entry.owner ?? 'me';
  const lang = i18n.language.startsWith('ru') ? 'ru' : 'en';
  const set = (key: string, value: string | number | undefined) => {
    const next = { ...chosen };
    if (value === undefined) delete next[key]; else next[key] = value;
    // A choice that stops being asked is dropped with its answer.
    const shown = new Set(shownChoices(specs, next).map(spec => spec.key));
    for (const name of Object.keys(next)) if (!shown.has(name) && specs.some(spec => spec.key === name)) delete next[name];
    onChange(next);
  };
  const systemTitleOf = (slot: string): string => { const name = systemNameOf(game, pack, slot); return name.planets.length > 0 ? name.planets.join(' / ') : name.number; };
  const nameOf = (spec: ChoiceSpec, value: string): string => {
    switch (spec.kind) {
      case 'planet': return pack.planets[value]?.name ?? value;
      case 'system': { const name = systemNameOf(game, pack, value); return name.planets.length > 0 ? name.planets.join(' / ') : name.number; }
      case 'player': return value === 'me' ? shortName(pack, game.faction, t('plan.mine')) : opponentShortName(game, pack, value, t);
      case 'unit': return t(`unit.${value}`);
      case 'component': return componentById(pack, value)?.name ?? value;
      default: return spec.names?.[value]?.[lang] ?? value;
    }
  };
  const colorOf = (spec: ChoiceSpec, value: string): number | undefined =>
    (spec.kind === 'player' ? (value === 'me' ? game.color : game.opponents.find(o => o.id === value)?.color) : undefined);
  const context: ChoiceContext = { game, pack, state: before, shared: shared ?? before, player: owner, entry, chosen };
  return (
    <Section label={def.name} title={def.name} className="choices-block">
      {shownChoices(specs, chosen).map(spec => {
        const label = spec.label?.[lang] ?? t(`components.choice.${spec.kind}`);
        if (spec.kind === 'number') {
          const [min, max] = spec.range ?? [0, 0];
          const value = typeof chosen[spec.key] === 'number' ? Number(chosen[spec.key]) : min;
          return (
            <Stepper
              key={spec.key} name={label} value={Math.min(max, Math.max(min, value))} min={min}
              onChange={next => set(spec.key, Math.min(max, Math.max(min, next)))}
            />
          );
        }
        if (spec.kind === 'counts') {
          const slots = spec.slots?.(context) ?? [];
          const verb = spec.verb?.[lang] ?? '';
          const nameOfSlot = (slot: ChoiceSlot): string => (slot.planet !== undefined
            ? t('components.choice.countOn', { verb, unit: t(`unit.${slot.unit}`), place: pack.planets[slot.planet]?.name ?? slot.planet })
            : t('components.choice.countIn', { verb, unit: t(`unit.${slot.unit}`) }));
          const groups = [...new Set(slots.map(slot => slot.group))];
          return (
            <div key={spec.key} className="choice-counts" role="group" aria-label={label}>
              {groups.map(group => (
                <div key={group ?? ''} className="choice-wrap" role="group" aria-label={group === undefined ? label : systemTitleOf(group)}>
                  {group !== undefined && <span className="muted choice-group">{systemTitleOf(group)}</span>}
                  {slots.filter(slot => slot.group === group).map(slot => {
                    const n = Number(chosen[slot.key] ?? 0);
                    const name = nameOfSlot(slot);
                    return (
                      <span key={slot.key} className="choice-count">
                        {/* The button stays where it is as it counts; the minus beside it is always there. */}
                        <button type="button" aria-pressed={n > 0} aria-label={name} title={name} onClick={() => set(slot.key, n + 1)}>
                          {t(`unit.${slot.unit}`)}{slot.planet !== undefined && <small> {pack.planets[slot.planet]?.name ?? slot.planet}</small>} <b>×{n}</b>
                        </button>
                        <button type="button" aria-label={t('components.choice.countBack', { label: name })} disabled={n <= 0} onClick={() => set(slot.key, n > 1 ? n - 1 : undefined)}>−</button>
                      </span>
                    );
                  })}
                </div>
              ))}
              {slots.length === 0 && <span className="muted">{t('components.choice.none')}</span>}
            </div>
          );
        }
        const options = optionsOf(spec, context);
        if (spec.kind === 'component' && options.length > MANY) {
          return (
            <ManyComponents
              key={spec.key} label={label} options={options} value={typeof chosen[spec.key] === 'string' ? String(chosen[spec.key]) : undefined}
              pack={pack} player={owner} onChange={value => set(spec.key, value)}
            />
          );
        }
        return (
          <div key={spec.key} className="choice-wrap" role="group" aria-label={label}>
            {options.map(value => (
              <button
                key={value} type="button" aria-pressed={chosen[spec.key] === value} style={playerStyle('--owner', colorOf(spec, value))}
                onClick={() => set(spec.key, chosen[spec.key] === value ? undefined : value)}
              >
                {nameOf(spec, value)}
              </button>
            ))}
            {options.length === 0 && <span className="muted">{t('components.choice.none')}</span>}
          </div>
        );
      })}
    </Section>
  );
}

interface ManyComponentsProps {
  label: string;
  options: string[];
  value?: string;
  pack: DataPack;
  player: string;
  onChange: (value: string | undefined) => void;
}

/** A choice among many components: the place of the chosen one, which opens the same picker as everywhere else. */
function ManyComponents({ label, options, value, pack, player, onChange }: ManyComponentsProps) {
  const [picking, setPicking] = useState(false);
  const known = options.filter(id => componentById(pack, id));
  return (
    <div className="choice-many" role="group" aria-label={label}>
      <ComponentSlot label={label} def={value ? componentById(pack, value) : undefined} pack={pack} onPick={() => setPicking(true)} onRemove={() => onChange(undefined)} />
      {picking && <ComponentPicker ids={known} player={player} onPick={id => { onChange(id); setPicking(false); }} onClose={() => setPicking(false)} />}
    </div>
  );
}
