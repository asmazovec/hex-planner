import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadPack } from '../../data/loadPack';
import { componentById, componentsOf } from '../../domain/components';
import type { ComponentKind } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { Modal } from '../overlays/Modal';
import { ComponentCard } from './ComponentCard';
import { ComponentSearchField } from './ComponentSearchField';
import { RESULT_LIMIT, useComponentSearch } from './useComponentSearch';

export interface ComponentPickerProps {
  /** Only these kinds are offered; every kind without it. */
  kinds?: ComponentKind[];
  /** Only these components are offered: all of them, in this order, before a query. */
  ids?: string[];
  /** Who chooses, `me` or an opponent id: before a query the components of their faction stand first. */
  player: string;
  onPick: (id: string) => void;
  onClose: () => void;
}

/** A window that finds one component: the search field of the drawer and its list, each card with a control that chooses it. */
export function ComponentPicker({ kinds, ids, player, onPick, onClose }: ComponentPickerProps) {
  const { t } = useTranslation();
  const game = useGame(s => s.game);
  const pack = useMemo(() => loadPack(game?.expansions ?? []), [game?.expansions]);
  const [query, setQuery] = useState('');
  const asked = useDeferredValue(query);
  const find = useComponentSearch(pack, kinds);
  const faction = player === 'me' ? game?.faction : game?.opponents.find(o => o.id === player)?.faction;
  const shown = useMemo(() => {
    if (ids) {
      const among = new Set(ids);
      return asked.trim() !== '' ? find(asked).filter(c => among.has(c.id)) : [...among].flatMap(id => componentById(pack, id) ?? []);
    }
    if (asked.trim() !== '') return find(asked);
    const offered = componentsOf(pack).filter(c => !kinds || kinds.includes(c.kind));
    return [...offered.filter(c => c.faction !== undefined && c.faction === faction), ...offered.filter(c => c.faction === undefined)].slice(0, RESULT_LIMIT);
  }, [asked, find, pack, kinds, ids, faction]);
  return (
    <Modal label={t('components.pick')} title={t('components.pick')} className="link-dialog component-picker" onClose={onClose} portal>
      <ComponentSearchField value={query} onChange={setQuery} autoFocus />
      {asked.trim() === '' && <span className="muted">{t('components.typeToSearch')}</span>}
      {asked.trim() !== '' && shown.length === 0 && <span className="muted">{t('components.nothing')}</span>}
      <div className="component-list">
        {shown.map(def => <ComponentCard key={def.id} def={def} pack={pack} pickLabel={t('components.choose', { name: def.name })} onAdd={() => onPick(def.id)} />)}
      </div>
    </Modal>
  );
}
