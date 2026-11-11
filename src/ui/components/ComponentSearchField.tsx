import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HexRemove } from '../primitives/Icon';

export interface ComponentSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

/**
 * The one search line of the components, the same in the drawer and in the picker: a name, a kind, a faction, an
 * attribute or words of the text, in Russian or in English, in any order (`src/domain/componentSearch.ts`). Its
 * placeholder says so; Escape or its cross empties it.
 */
export function ComponentSearchField({ value, onChange, autoFocus }: ComponentSearchFieldProps) {
  const { t } = useTranslation();
  const filled = value !== '';
  useEffect(() => {
    if (!filled) return undefined;
    // Heard before the window or drawer around the field: Escape only empties the field, wherever the focus is.
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onChange('');
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [filled, onChange]);
  return (
    <div className="component-search">
      <input
        type="text" role="searchbox" aria-label={t('components.search')} placeholder={t('components.searchHint')} value={value} autoFocus={autoFocus}
        autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="search"
        onChange={e => onChange(e.target.value)}
      />
      {value !== '' && <HexRemove label={t('components.clear')} onClick={() => onChange('')} />}
    </div>
  );
}
