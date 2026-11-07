const ICONS = {
  grip: <path d="M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01" strokeWidth="2.6" />,
  edit: <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16zM13.5 6.5l4 4" />,
  done: <path d="M5 12.5l5 5L19.5 7" />,
  remove: <path d="M6 6l12 12M18 6L6 18" />,
  reset: <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0" />,
  build: <path d="M12 3l4 2.3v4.5L12 12 8 9.8V5.3zM8 12l4 2.2v4.5L8 21l-4-2.3v-4.5zM16 12l4 2.2v4.5L16 21l-4-2.3v-4.5z" />,
  paste: <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2" />,
  game: <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 3.1a4 4 0 0 1 0 7.8M21 21v-2a4 4 0 0 0-3-3.9" />,
  plan: <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3zM9 4v13M15 7v13" />,
  export: <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14" />,
  chevron: <path d="M6 9l6 6 6-6" />,
};

/** The icons of a plan row. */
export function RowIcon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

/** The one control that removes or closes something, everywhere in the app. */
export function HexRemove({ label, className, disabled, onClick }: { label: string; className?: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`hex-button${className ? ` ${className}` : ''}`} aria-label={label} title={label} disabled={disabled} onClick={onClick}>
      <RowIcon name="remove" />
    </button>
  );
}
