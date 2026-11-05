import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mapIsEmpty } from '../../domain/mapBuilder';
import { MILTY_TOKENS, parseMapString, type MapStringResult } from '../../domain/mapString';
import type { DataPack, Game } from '../../domain/types';
import { useGame } from '../../state/gameStore';

export interface MapStringImportProps {
  game: Game;
  pack: DataPack;
  onClose: () => void;
}

/** A small panel for pasting the map string of a Milty Draft; it replaces the map in one undo step. */
export function MapStringImport({ game, pack, onClose }: MapStringImportProps) {
  const { t } = useTranslation();
  const setMap = useGame(s => s.setMap);
  const [text, setText] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<MapStringResult | null>(null);
  const parsed = parseMapString(text, game.playerCount, pack);
  const nothing = Object.keys(parsed.map).length === 0;

  const apply = () => {
    setMap(parsed.map);
    setResult(parsed);
    setConfirming(false);
    setText('');
  };
  const onApply = () => (mapIsEmpty(game, pack) ? apply() : setConfirming(true));

  return (
    <div className="map-import" role="group" aria-label={t('mapImport.title')}>
      <div className="panel-head">
        <strong>{t('mapImport.title')}</strong>
        <button type="button" onClick={onClose}>{t('map.sheet.close')}</button>
      </div>
      <textarea
        aria-label={t('mapImport.field')} placeholder={t('mapImport.placeholder')} rows={4} value={text}
        onChange={e => { setText(e.target.value); setConfirming(false); }}
      />
      {confirming ? (
        <div className="row">
          <span className="muted">{t('mapImport.confirm')}</span>
          <button type="button" className="primary" onClick={apply}>{t('mapImport.replace')}</button>
          <button type="button" onClick={() => setConfirming(false)}>{t('mapImport.cancel')}</button>
        </div>
      ) : (
        <div className="row">
          <button type="button" className="primary" disabled={nothing} onClick={onApply}>{t('mapImport.apply')}</button>
        </div>
      )}
      {result && (
        <div className="muted" role="status">
          <p>{t('mapImport.placed', { n: result.found })}</p>
          {result.unknown.length > 0 && <p>{t('mapImport.unknown', { list: result.unknown.join(', ') })}</p>}
          {result.dropped > 0 && <p>{t('mapImport.dropped', { n: result.dropped })}</p>}
          {result.tokens !== MILTY_TOKENS && <p>{t('mapImport.tokens', { n: result.tokens })}</p>}
          {result.found !== result.expected && <p>{t('mapImport.mismatch', { found: result.found, expected: result.expected })}</p>}
          {result.homes > 0 && <p>{t('mapImport.homesPlaced', { n: result.homes })}</p>}
          {result.homes === 0 && <p>{t('mapImport.homesEmpty')}</p>}
        </div>
      )}
    </div>
  );
}
