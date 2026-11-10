import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { textOf } from '../../domain/components';
import type { ComponentDef, ComponentPack, DataPack, LeaderState } from '../../domain/types';
import { EXPANSION_NAMES } from '../common/expansions';
import { HexRemove, RowIcon } from '../primitives/Icon';

const PACK_NAMES: Record<ComponentPack, string> = { base: 'Base', ...EXPANSION_NAMES };

/** How a component stands with its player, beyond being held: a leader may also be locked or purged. */
export type CardState = LeaderState | 'locked';

export interface ComponentCardProps {
  def: ComponentDef;
  pack: DataPack;
  /** The player has it: the edge of what is chosen. */
  held?: boolean;
  /** Said under the name; an exhausted or purged component stands dimmed. */
  state?: CardState;
  /** Said under the name as it is: "in hand", "scored". */
  note?: string;
  /** How many copies are held; said from two on. */
  count?: number;
  /** The round whose entry of the plan brought it. */
  source?: number;
  /** Given, the cross inside the card takes the component off. */
  onRemove?: () => void;
  /** Given, a plus inside the card adds the component; `pickLabel` names it for a choice instead. */
  onAdd?: () => void;
  pickLabel?: string;
  /** Given, the control inside the card moves a leader to its next state. */
  onCycle?: () => void;
  /** Under the row of the card: the stepper of a hand. */
  children?: ReactNode;
}

/**
 * One component as a card: its name, kind and expansion; a press opens its printed text in place, word for word.
 * Whatever changes it stands inside the card, at its right edge.
 */
export function ComponentCard({ def, pack, held, state, note, count, source, onRemove, onAdd, pickLabel, onCycle, children }: ComponentCardProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const unlock = textOf(pack, `${def.id}#unlock`);
  const dim = state === 'exhausted' || state === 'purged';
  const faction = def.faction ? pack.factions[def.faction]?.name : undefined;
  const stateName = state && t(`components.state.${state}`);
  const facts = [
    t(`components.kind.${def.kind}`), faction, PACK_NAMES[def.pack],
    state && state !== 'unlocked' ? stateName : undefined, note, source !== undefined ? t('components.fromRound', { n: source }) : undefined,
  ].filter(Boolean);
  const addLabel = pickLabel ?? t('components.add', { name: def.name });
  const control = onCycle
    ? (
      <button type="button" className="icon-button" aria-label={t('components.leaderCycle', { name: def.name, state: stateName ?? t('components.state.locked') })} onClick={onCycle}>
        <RowIcon name="cycle" />
      </button>
    )
    : onRemove ? <HexRemove label={t('components.remove', { name: def.name })} onClick={onRemove} />
      : onAdd ? <button type="button" className="icon-button" aria-label={addLabel} title={addLabel} onClick={onAdd}><RowIcon name="add" /></button>
        : null;
  return (
    <div className={`component-card${held ? ' on' : ''}${dim ? ' dim' : ''}`} data-testid={`component-${def.id}`}>
      <div className="in-card">
        <button type="button" className="source-button" aria-expanded={open} onClick={() => setOpen(!open)}>
          <b>{def.name}</b>{count !== undefined && count > 1 && <span className="component-count"> ×{count}</span>}
          <small>{facts.join(' · ')}</small>
        </button>
        {control}
      </div>
      {open && (
        <p className="component-text">
          {def.text || t('components.noText')}
          {unlock && <span className="muted">{`\n${t('players.unlock', { text: unlock })}`}</span>}
        </p>
      )}
      {children}
    </div>
  );
}
