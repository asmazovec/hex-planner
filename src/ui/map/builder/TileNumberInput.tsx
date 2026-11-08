import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { lookUpTile, tileSuggestions } from '../../../domain/mapBuilder';
import type { DataPack } from '../../../domain/types';
import { Banner } from '../../feedback/Banner';

export interface TileNumberInputProps {
  pack: DataPack;
  /** Current `Game.map` value of the slot, if any. */
  value: string | undefined;
  /** A new map value, or null to clear the slot. */
  onChange: (value: string | null) => void;
}

const MAX_SUGGESTIONS = 8;

/** Enter a tile number for one slot; suggestions are tappable, hyperlanes get a rotate button. */
export function TileNumberInput({ pack, value, onChange }: TileNumberInputProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);
  // Focused without scrolling: the page stays where the tapped slot is (autoFocus would scroll the field into view).
  useEffect(() => { field.current?.focus({ preventScroll: true }); }, []);
  const [placedId, placedRotation] = (value ?? '').split('@');
  const placed = value ? pack.tiles[placedId] : undefined;
  const rotation = Number(placedRotation) || 0;
  const suggestions = tileSuggestions(text, pack).slice(0, MAX_SUGGESTIONS);

  const place = (id: string) => {
    // A hyperlane keeps its side in the id and its turn after the @.
    onChange(pack.tiles[id].kind === 'hyperlane' ? `${id}@${placed?.kind === 'hyperlane' ? rotation : 0}` : id);
    setText('');
    setError(null);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const query = text.trim();
    if (query === '') return;
    const tile = lookUpTile(query, pack);
    if (typeof tile !== 'string') place(tile.id);
    else setError(t(`builder.${tile}`, { query }));
  };

  return (
    <div className="tile-input" role="group" aria-label={t('builder.title')}>
      <h2>{t('builder.title')}</h2>
      <form className="row" onSubmit={submit}>
        <label className="field">
          {t('builder.number')}
          <input
            ref={field} value={text} inputMode="text" autoCapitalize="characters" autoComplete="off"
            onChange={e => { setText(e.target.value); setError(null); }}
          />
        </label>
        <button type="submit" className="primary">{t('builder.set')}</button>
        <button type="button" disabled={!value} onClick={() => onChange(null)}>{t('builder.clear')}</button>
      </form>
      {error && <Banner kind="warning" message={error} alert />}
      {suggestions.length > 0 && (
        <div className="chips" role="group" aria-label={t('builder.suggestions')}>
          {suggestions.map(tile => (
            <button key={tile.id} type="button" onClick={() => place(tile.id)}>{tile.id}</button>
          ))}
        </div>
      )}
      {placed?.kind === 'hyperlane' && (
        <div className="row">
          <button type="button" onClick={() => onChange(`${placedId}@${(rotation + 1) % 6}`)}>{t('builder.rotate')}</button>
          <span className="muted">{t('map.sheet.rotation', { deg: rotation * 60 })}</span>
        </div>
      )}
    </div>
  );
}
