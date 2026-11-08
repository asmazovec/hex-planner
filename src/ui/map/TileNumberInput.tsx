import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveTile, tileSuggestions } from '../../domain/mapBuilder';
import type { DataPack } from '../../domain/types';

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
    const tile = resolveTile(query, pack);
    if (tile) place(tile.id);
    else {
      // TODO(P2-258) #ws:ui-logic-to-domain #type:dup #size:s #map-builder — Причину отказа (номер неоднозначен или неизвестен) UI выясняет сам, повторяя поиск: пусть resolveTile в domain/mapBuilder.ts её возвращает
      const sides = Object.values(pack.tiles).filter(tile => tile.number.toUpperCase() === query.toUpperCase());
      setError(t(sides.length > 1 ? 'builder.ambiguous' : 'builder.unknown', { query }));
    }
  };

  // TODO(P2-255) #ws:ui-css #type:dead #dep:P2-254 #size:s #panel — Тот же .panel, с которого CSS снимает оформление: убрать
  return (
    <div className="panel tile-input" role="group" aria-label={t('builder.title')}>
      <h2>{t('builder.title')}</h2>
      <form className="row" onSubmit={submit}>
        <label className="field">
          {t('builder.number')}
          <input
            value={text} inputMode="text" autoCapitalize="characters" autoComplete="off" autoFocus
            onChange={e => { setText(e.target.value); setError(null); }}
          />
        </label>
        <button type="submit" className="primary">{t('builder.set')}</button>
        <button type="button" disabled={!value} onClick={() => onChange(null)}>{t('builder.clear')}</button>
      </form>
      {/* TODO(P2-256) #ws:ui-containers #type:ui #size:s #banner — Разметка баннера руками (p.banner.banner-warning): Banner kind="warning" */}
      {error && <p role="alert" className="banner banner-warning">{error}</p>}
      {/* TODO(P2-257) #ws:ui-css #type:ui #size:s #chips — Ряд подсказок на .row без общего класса, хотя есть .chips: перевести на .chips */}
      {suggestions.length > 0 && (
        <div className="row" role="group" aria-label={t('builder.suggestions')}>
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
