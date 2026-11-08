import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { HexRemove } from './Icon';

export interface EditorFrameProps {
  title: ReactNode;
  /** What the cross removes: the action, or the route of a flight step. */
  removeLabel: string;
  onRemove: () => void;
  /** Closes and keeps what is set; a step and the choice of a system have none. */
  onDone?: () => void;
  /** A step inside an editor goes back to it. */
  onBack?: () => void;
  /** The editor's own layout, e.g. `strategy-editor`. */
  className?: string;
  children?: ReactNode;
}

/**
 * The one frame of every editor in the plan panel: the head with its title, «Готово» and the cross that removes what is
 * edited, a step's «Назад» before the title; then the editor's blocks. No footer.
 */
export function EditorFrame({ title, removeLabel, onRemove, onDone, onBack, className, children }: EditorFrameProps) {
  const { t } = useTranslation();
  return (
    <div className={`editor-frame panel-stack${className ? ` ${className}` : ''}`}>
      <div className="panel-head editor-head">
        {onBack && <button type="button" className="editor-back" onClick={onBack}><span aria-hidden="true">← </span>{t('editor.back')}</button>}
        <h2>{title}</h2>
        <span className="editor-head-actions">
          {onDone && <button type="button" className="primary" onClick={onDone}>{t('editor.done')}</button>}
          <HexRemove label={removeLabel} onClick={onRemove} />
        </span>
      </div>
      {children}
    </div>
  );
}
