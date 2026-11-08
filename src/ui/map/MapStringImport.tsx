import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mapIsEmpty } from '../../domain/mapBuilder';
import { loadPack } from '../../data/loadPack';
import { arrangeSet, parseMapString, type MapStringResult, type OtherPacks } from '../../domain/mapString';
import type { DataPack, ExpansionId, Game } from '../../domain/types';
import { useGame } from '../../state/gameStore';

/** Each expansion on its own: tells a tile of an expansion that is off from a tile nobody knows. */
const OTHER_PACKS: OtherPacks = { pok: loadPack(['pok']), te: loadPack(['te']) };
// TODO(P2-249) #ws:ui-structure #type:dup #size:s #expansions — Названия дополнений прописаны ещё в GameScreen, FactionComponents и FactionPicker: одно место для всех
const EXPANSION_NAMES: Record<ExpansionId, string> = { pok: 'Prophecy of Kings', te: "Thunder's Edge" };

export interface MapStringImportProps {
  game: Game;
  pack: DataPack;
  onClose: () => void;
}

/** A small panel for pasting the map string of a Milty Draft; it replaces the map in one undo step. */
export function MapStringImport({ game, pack, onClose }: MapStringImportProps) {
  const { t } = useTranslation();
  const setMap = useGame(s => s.setMap);
  const addExpansion = useGame(s => s.addExpansion);
  const [text, setText] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<MapStringResult | null>(null);
  const parsed = parseMapString(text, game.playerCount, pack, OTHER_PACKS);
  const off = (Object.keys(parsed.offExpansion) as ExpansionId[]).filter(id => parsed.offExpansion[id]);
  const isSet = parsed.kind === 'set';
  const arranged = isSet ? arrangeSet(parsed.set, game.playerCount, pack) : parsed;
  const nothing = Object.keys(arranged.map).filter(slot => slot !== '0,0').length === 0;

  const apply = () => {
    setMap(arranged.map, arranged.layout);
    setResult({ ...arranged, unknown: parsed.unknown, offExpansion: parsed.offExpansion });
    setConfirming(false);
    setText('');
  };
  const onApply = () => (mapIsEmpty(game, pack) ? apply() : setConfirming(true));

  // TODO(P2-248) #ws:ui-containers #type:dup #dep:P2-259 #size:m #popover #section — Плавающая карточка .map-import повторяет .tile-popover, а panel-head собран руками: Popover с якорем и Section
  return (
    <div className="map-import" role="group" aria-label={t('mapImport.title')}>
      <div className="panel-head">
        <strong>{t('mapImport.title')}</strong>
        {/* TODO(P2-247) #ws:ui-containers #type:ui #needs:prototype #size:s #close-button — Текстовая кнопка «Закрыть»: HexRemove, как везде */}
        <button type="button" onClick={onClose}>{t('map.sheet.close')}</button>
      </div>
      <textarea
        aria-label={t('mapImport.field')} placeholder={t('mapImport.placeholder')} rows={4} value={text}
        onChange={e => { setText(e.target.value); setConfirming(false); }}
      />
      {off.map(id => (
        <div key={id} className="row">
          <span className="muted">{t('mapImport.offExpansion', { list: parsed.offExpansion[id]!.join(', '), name: EXPANSION_NAMES[id] })}</span>
          <button type="button" onClick={() => addExpansion(id)}>{t('mapImport.turnOn', { name: EXPANSION_NAMES[id] })}</button>
        </div>
      ))}
      {isSet && <p className="muted">{t('mapImport.set', { n: parsed.set.length })}</p>}
      {/* TODO(P2-250) #ws:ui-containers #type:dup #needs:prototype #size:s #confirm-bar — Строка подтверждения .row (текст, «Заменить», «Отмена») — четвёртый вид после player-confirm, GameScreen и LayoutPicker: ConfirmBar */}
      {confirming ? (
        <div className="row">
          <span className="muted">{t('mapImport.confirm')}</span>
          <button type="button" className="primary" onClick={apply}>{t('mapImport.replace')}</button>
          <button type="button" onClick={() => setConfirming(false)}>{t('mapImport.cancel')}</button>
        </div>
      ) : (
        <div className="row">
          {isSet
            ? <button type="button" className="primary" disabled={nothing} onClick={onApply}>{t('mapImport.arrange')}</button>
            : <button type="button" className="primary" disabled={nothing} onClick={onApply}>{t('mapImport.apply')}</button>}
        </div>
      )}
      {result && (
        <div className="muted" role="status">
          <p>{t('mapImport.placed', { n: result.found })}</p>
          <p>{t('mapImport.layout', { name: t(`layout.${result.layout}`) })}</p>
          {(Object.keys(result.offExpansion) as ExpansionId[]).map(id => (
            <p key={id}>{t('mapImport.offExpansion', { list: result.offExpansion[id]!.join(', '), name: EXPANSION_NAMES[id] })}</p>
          ))}
          {result.unknown.length > 0 && <p>{t('mapImport.unknown', { list: result.unknown.join(', ') })}</p>}
          {result.dropped > 0 && <p>{t('mapImport.dropped', { n: result.dropped })}</p>}
          {!result.tokensComplete && <p>{t('mapImport.tokens', { n: result.tokens })}</p>}
          {result.found !== result.expected && <p>{t('mapImport.mismatch', { found: result.found, expected: result.expected })}</p>}
          {result.homes > 0 && <p>{t('mapImport.homesPlaced', { n: result.homes })}</p>}
          {result.homes === 0 && <p>{t('mapImport.homesEmpty')}</p>}
        </div>
      )}
    </div>
  );
}
