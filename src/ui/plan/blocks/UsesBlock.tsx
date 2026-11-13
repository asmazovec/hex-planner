import { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { componentById } from '../../../domain/components';
import { readyToPlay } from '../../../domain/project';
import type { ComponentKind, DataPack, Entry, Game, GameState, Warning } from '../../../domain/types';
import { ComponentCard } from '../../components/ComponentCard';
import { ComponentPicker } from '../../components/ComponentPicker';
import { noteMark } from '../../components/noteMark';
import { withChoices } from '../../../domain/effects/choices';
import { usesWarnings } from '../../feedback/warningPlaces';
import { WarningList } from '../../feedback/WarningText';
import { Section } from '../../primitives/Section';
import { ChoicesBlock } from './ChoicesBlock';

/** What can be used with an entry: everything a component action can play, and what a faction sheet brings. */
const USED_KINDS: ComponentKind[] = ['actionCard', 'leader', 'relic', 'technology', 'promissory', 'ability', 'breakthrough', 'mech', 'legendary', 'agenda', 'exploration'];

export interface UsesBlockProps {
  /** Any entry: its owner uses the components. */
  entry: Entry;
  /** The game as the owner of the entry sees it. */
  game: Game;
  pack: DataPack;
  /** The state of the entry's owner just before it: what they hold ready then stands first in the choice. */
  before?: GameState;
  /** The warnings of the entry: those of the components named here stand in this block. */
  warnings?: Warning[];
  /** The new list; without a value when it became empty. */
  onChange: (patch: { uses?: string[]; choices?: Record<string, string | number>; useChoices?: Record<string, Record<string, string | number>> }) => void;
}

/**
 * The components the owner of an entry uses with it beside its own action (`uses`): an agent or a technology
 * exhausted, an ability invoked. Each is a card with its cross; the button that opens the choice stands over the
 * cards, so a card added moves no button. The choice forbids nothing: what the owner holds ready stands first, the rest
 * is marked, and the plan warns of a component not held or exhausted. What a component used here allows is listed
 * among the warnings of the entry as allowed.
 */
export function UsesBlock({ entry, game, pack, before, warnings = [], onChange }: UsesBlockProps) {
  const { t } = useTranslation();
  const [picking, setPicking] = useState(false);
  const list = entry.uses ?? [];
  const write = (ids: string[]) => {
    // What was chosen for a component no longer used goes with it.
    const kept = Object.fromEntries(Object.entries(entry.useChoices ?? {}).filter(([id]) => ids.includes(id)));
    onChange({ uses: ids.length > 0 ? ids : undefined, ...(entry.useChoices ? { useChoices: Object.keys(kept).length > 0 ? kept : undefined } : {}) });
  };
  const ready = useMemo(() => (before ? readyToPlay(pack, before.holdings, game.faction, before.control) : undefined), [before, pack, game.faction]);
  const title = t('components.uses.title');
  return (
    <Section label={title} title={title} warnings={<WarningList warnings={usesWarnings(entry, warnings)} game={game} pack={pack} />}>
      <span className="muted">{t('components.uses.hint')}</span>
      <div className="side-actions">
        <button type="button" onClick={() => setPicking(true)}>{t('components.uses.add')}</button>
      </div>
      {list.map((id, index) => {
        const def = componentById(pack, id);
        const mark = def && noteMark(game, pack, def.id, t, entry.owner ?? 'me');
        return def && (
          <Fragment key={`${id}-${index}`}>
            <ComponentCard
              def={def} pack={pack} held note={t('components.uses.used')} owner={mark?.owner} text={mark?.text}
              onRemove={() => write(list.filter((_, i) => i !== index))}
            />
            {before && <ChoicesBlock id={id} entry={entry} game={game} pack={pack} before={before} onChange={chosen => onChange(withChoices(entry, id, chosen))} />}
          </Fragment>
        );
      })}
      {picking && (
        <ComponentPicker
          kinds={USED_KINDS} player={entry.owner ?? 'me'} owned={ready} prefer="owned" onClose={() => setPicking(false)}
          onPick={id => { if (!list.includes(id)) write([...list, id]); setPicking(false); }}
        />
      )}
    </Section>
  );
}
