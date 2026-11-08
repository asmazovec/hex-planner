import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export const ACTION_TYPES = ['tactical', 'strategic', 'component', 'pass', 'expedition', 'adjustment'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export interface ActionMenuProps {
  onPick: (type: ActionType) => void;
}

export function ActionMenu({ onPick }: ActionMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="action-menu">
      <button type="button" className="primary" aria-expanded={open} onClick={() => setOpen(!open)}>{t('plan.menu.add')}</button>
      {/* TODO(P2-357) #ws:ui-nesting #type:ui #needs:prototype — список действий раскрывается в подвале списка записей (4 уровня); поповер над кнопкой */}
      {open && (
        <div className="card-list">
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
