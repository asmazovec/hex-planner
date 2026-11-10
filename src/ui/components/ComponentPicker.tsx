import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadPack } from '../../data/loadPack';
import { componentById, componentsOf } from '../../domain/components';
import type { ComponentDef, ComponentKind } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { Modal } from '../overlays/Modal';
import { ComponentCard } from './ComponentCard';
import { ComponentSearchField } from './ComponentSearchField';
import { RESULT_LIMIT, useComponentSearch } from './useComponentSearch';

export interface ComponentPickerProps {
  /** Only these kinds are offered; every kind without it. */
  kinds?: ComponentKind[];
  /** Only these components are offered, and the search looks among them alone; an id given twice is one card with its count. */
  ids?: string[];
  /** What the player holds, for `prefer` to order the list by. */
  owned?: Set<string>;
  /**
   * `owned`: what is held stands first, and the rest says it is not held (something is played). `new`: what is held
   * already stands last and says so (something is taken). Either way everything can be chosen.
   */
  prefer?: 'owned' | 'new';
  /** Who chooses, `me` or an opponent id: before a query the components of their faction stand first. */
  player: string;
  onPick: (id: string) => void;
  onClose: () => void;
}

/** A window that finds one component: the search field of the drawer and its list, each card with a control that chooses it. */
export function ComponentPicker({ kinds, ids, owned, prefer, player, onPick, onClose }: ComponentPickerProps) {
  const { t } = useTranslation();
  const game = useGame(s => s.game);
  const pack = useMemo(() => loadPack(game?.expansions ?? []), [game?.expansions]);
  const [query, setQuery] = useState('');
  const asked = useDeferredValue(query);
  const among = useMemo(() => ids && new Set(ids), [ids]);
  const find = useComponentSearch(pack, kinds, among);
  const faction = player === 'me' ? game?.faction : game?.opponents.find(o => o.id === player)?.faction;
  const shown = useMemo(() => {
    const held = (def: ComponentDef) => owned?.has(def.id) ?? false;
    /** The preferred first, the rest after them, each part in the order it came. */
    const ordered = (list: ComponentDef[]) => (!prefer || !owned ? list : [...list.filter(def => held(def) === (prefer === 'owned')), ...list.filter(def => held(def) !== (prefer === 'owned'))]);
    if (asked.trim() !== '') return ordered(find(asked));
    if (among) return ordered([...among].flatMap(id => componentById(pack, id) ?? []).filter(c => !kinds || kinds.includes(c.kind)));
    const offered = componentsOf(pack).filter(c => !kinds || kinds.includes(c.kind));
    return ordered([...offered.filter(c => c.faction !== undefined && c.faction === faction), ...offered.filter(c => c.faction === undefined)]).slice(0, RESULT_LIMIT);
  }, [asked, find, pack, kinds, faction, among, owned, prefer]);
  const noteOf = (def: ComponentDef): string | undefined => {
    if (!prefer || !owned) return undefined;
    if (prefer === 'new') return owned.has(def.id) ? t('components.alreadyHeld') : undefined;
    return owned.has(def.id) ? undefined : t('components.notHeld');
  };
  return (
    <Modal label={t('components.pick')} title={t('components.pick')} className="link-dialog component-picker" onClose={onClose} portal>
      <ComponentSearchField value={query} onChange={setQuery} autoFocus />
      {asked.trim() === '' && !among && <span className="muted">{t('components.typeToSearch')}</span>}
      {asked.trim() !== '' && shown.length === 0 && <span className="muted">{t('components.nothing')}</span>}
      <div className="component-list">
        {shown.map(def => (
          <ComponentCard
            key={def.id} def={def} pack={pack} held={owned?.has(def.id)} note={noteOf(def)} count={ids?.filter(id => id === def.id).length}
            pickLabel={t('components.choose', { name: def.name })} onAdd={() => onPick(def.id)}
          />
        ))}
      </div>
    </Modal>
  );
}
