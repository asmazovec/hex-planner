import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export const ACTION_TYPES = ['tactical', 'strategic', 'secondary', 'component', 'pass', 'expedition', 'adjustment'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export interface ActionMenuProps {
  onPick: (type: ActionType) => void;
  /** The held primaries are already in the plan: the strategic item says so and still works. */
  primaryPlayed?: boolean;
}

export function ActionMenu({ onPick, primaryPlayed = false }: ActionMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="action-menu">
      <button type="button" className="primary" aria-expanded={open} onClick={() => setOpen(!open)}>{t('plan.menu.add')}</button>
      {open && (
        <div className="card-list">
          {ACTION_TYPES.map(type => (
            <button key={type} type="button" onClick={() => { setOpen(false); onPick(type); }}>
              {t(type === 'strategic' && primaryPlayed ? 'plan.menu.strategicPlayed' : `plan.menu.${type}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
