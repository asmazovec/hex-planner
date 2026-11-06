import type { ReactNode } from 'react';

export interface BannerProps {
  kind: 'error' | 'warning' | 'info';
  message: ReactNode;
  action?: { label: string; onClick: () => void };
}

/** Errors are announced as alerts; warnings and reminders as polite status messages. */
export function Banner({ kind, message, action }: BannerProps) {
  return (
    <div className={`banner banner-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span className="banner-text">{message}</span>
      {action && (
        <button type="button" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
