import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export const ACTION_TYPES = ['tactical', 'strategic', 'component', 'pass', 'expedition', 'adjustment'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export interface ActionMenuProps {
  onPick: (type: ActionType) => void;
  /** Stands above the button in the same frame: whose action it will be. */
  lead?: ReactNode;
}

/**
 * One unit at the foot of the actions: whose action, «New action» right under it, and the list of action types
 * opening under the button inside the same frame, never over the map.
 */
export function ActionMenu({ onPick, lead }: ActionMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const listId = useId();
  return (
    <div className={`action-menu${open ? ' action-menu-open' : ''}`}>
      {lead}
      <button
        type="button" className="primary action-menu-toggle" aria-expanded={open} aria-controls={open ? listId : undefined}
        onClick={() => setOpen(!open)} onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
      >
        {t('plan.menu.add')}
      </button>
      {open && (
        <div id={listId} className="card-list action-list">
          {ACTION_TYPES.map(type => (
            <button key={type} type="button" onClick={() => { setOpen(false); onPick(type); }}>
              {t(`plan.menu.${type}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
