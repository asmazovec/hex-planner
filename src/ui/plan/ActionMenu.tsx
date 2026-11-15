import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** An expedition is not an action: it is added to a turn, in the action's own editor. */
export const ACTION_TYPES = ['tactical', 'strategic', 'component', 'pass', 'adjustment'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export interface ActionMenuProps {
  onPick: (type: ActionType) => void;
}

/**
 * One unit at the foot of the actions: «New action» and the list of action types opening under the button inside the
 * same frame, never over the map. The action is the shown player's: whose it is, the switch at the top of the panel says.
 */
export function ActionMenu({ onPick }: ActionMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const listId = useId();
  return (
    <div className={`action-menu${open ? ' action-menu-open' : ''}`}>
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
