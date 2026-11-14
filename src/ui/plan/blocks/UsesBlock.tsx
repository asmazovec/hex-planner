import { Fragment, useMemo, useState } from 'react';
import type { KernelView } from '../kernelView';
import { useTranslation } from 'react-i18next';
import { componentById } from '../../../domain/components';
import type { ComponentKind, DataPack, Warning } from '../../../domain/types';
import type { Turn } from '../../../game/actions';
import { withChoicesOf, withUses } from '../../../game/edit/turn';
import { legacyKey } from '../../../game/keys';
import { readyToPlayOn } from '../../../game/planQueries';
import { ComponentCard } from '../../components/ComponentCard';
import { ComponentPicker } from '../../components/ComponentPicker';
import { noteMark } from '../../components/noteMark';
import { usesWarnings, usingOf } from '../../feedback/warningPlaces';
import { WarningList } from '../../feedback/WarningText';
import { Section } from '../../primitives/Section';
import { ChoicesBlock } from './ChoicesBlock';

/** What can be used with an entry: everything a component action can play, and what a faction sheet brings. */
const USED_KINDS: ComponentKind[] = ['actionCard', 'leader', 'relic', 'technology', 'promissory', 'ability', 'breakthrough', 'mech', 'legendary', 'agenda', 'exploration'];

export interface UsesBlockProps {
  /** The table and the board just before the entry, as the kernel keeps them: names, notes, reminders and the places of warnings are read from it. */
  view: KernelView;
  /** Any turn: its player uses the components. */
  turn: Turn;
  pack: DataPack;
  /** The warnings of the entry: those of the components named here stand in this block. */
  warnings?: Warning[];
  /** The turn with its new list of uses. */
  onChange: (turn: Turn) => void;
}

/**
 * The components the owner of an entry uses with it beside its own action (`uses`): an agent or a technology
 * exhausted, an ability invoked. Each is a card with its cross; the button that opens the choice stands over the
 * cards, so a card added moves no button. The choice forbids nothing: what the owner holds ready stands first, the rest
 * is marked, and the plan warns of a component not held or exhausted. What a component used here allows is listed
 * among the warnings of the entry as allowed.
 */
export function UsesBlock({ turn, pack, view, warnings = [], onChange }: UsesBlockProps) {
  const { t } = useTranslation();
  const [picking, setPicking] = useState(false);
  const list = turn.used.map(u => u.component);
  // What was chosen for a component no longer used goes with it.
  const write = (ids: string[]) => onChange(withUses(turn, ids));
  const ready = useMemo(() => readyToPlayOn(view.table, view.board, pack, turn.player), [view, pack, turn.player]);
  const title = t('components.uses.title');
  return (
    <Section label={title} title={title} warnings={<WarningList warnings={usesWarnings(usingOf(turn), warnings)} table={view.table} board={view.board} pack={pack} />}>
      <span className="muted">{t('components.uses.hint')}</span>
      <div className="side-actions">
        <button type="button" onClick={() => setPicking(true)}>{t('components.uses.add')}</button>
      </div>
      {list.map((id, index) => {
        const def = componentById(pack, id);
        const mark = def && noteMark(view.table, pack, def.id, t);
        return def && (
          <Fragment key={`${id}-${index}`}>
            <ComponentCard
              def={def} pack={pack} held note={t('components.uses.used')} owner={mark?.owner} text={mark?.text}
              onRemove={() => write(list.filter((_, i) => i !== index))}
            />
            <ChoicesBlock id={id} turn={turn} view={view} pack={pack} onChange={chosen => onChange(withChoicesOf(turn, id, chosen))} />
          </Fragment>
        );
      })}
      {picking && (
        <ComponentPicker
          kinds={USED_KINDS} player={legacyKey(view.table, turn.player)} owned={ready} prefer="owned" onClose={() => setPicking(false)}
          onPick={id => { if (!list.includes(id)) write([...list, id]); setPicking(false); }}
        />
      )}
    </Section>
  );
}
