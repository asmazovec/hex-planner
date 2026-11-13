import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mapIsEmpty } from '../../../domain/mapBuilder';
import { loadPack } from '../../../data/loadPack';
import { emptySeatHomes } from '../../../domain/players';
import { arrangeSet, parseMapString, type MapStringResult, type OtherPacks } from '../../../domain/mapString';
import type { DataPack, ExpansionId, Game } from '../../../domain/types';
import { useGame } from '../../../state/gameStore';
import { EXPANSION_NAMES } from '../../common/expansions';
import { ConfirmBar } from '../../primitives/ConfirmBar';
import { HexRemove } from '../../primitives/Icon';

/** Each expansion on its own: tells a tile of an expansion that is off from a tile nobody knows. */
const OTHER_PACKS: OtherPacks = { pok: loadPack(['pok']), te: loadPack(['te']) };

export interface MapStringImportProps {
  game: Game;
  pack: DataPack;
  /** The game has started: its layout stays, so a string of another layout cannot be applied. */
  started?: boolean;
  onClose: () => void;
}

/** A panel in the map block for pasting the map string of a Milty Draft; it replaces the map in one undo step. */
export function MapStringImport({ game, pack, started = false, onClose }: MapStringImportProps) {
  const { t } = useTranslation();
  const setMap = useGame(s => s.setMap);
  const addExpansion = useGame(s => s.addExpansion);
  const setDraftExpansions = useGame(s => s.setDraftExpansions);
  // The open game turns an expansion on in one undo step; the draft has its own toggle.
  const turnOn = (id: ExpansionId) => (started ? addExpansion(id) : setDraftExpansions([...game.expansions, id]));
  const [text, setText] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<(MapStringResult & { seated: number }) | null>(null);
  const parsed = parseMapString(text, game.playerCount, pack, OTHER_PACKS);
  const off = (Object.keys(parsed.offExpansion) as ExpansionId[]).filter(id => parsed.offExpansion[id]);
  const isSet = parsed.kind === 'set';
  const arranged = isSet ? arrangeSet(parsed.set, game.playerCount, pack) : parsed;
  const nothing = Object.keys(arranged.map).filter(slot => slot !== '0,0').length === 0;
  const otherLayout = started && !nothing && arranged.layout !== game.layout;

  const apply = () => {
    const seated = Object.keys(emptySeatHomes({ ...game, map: arranged.map, layout: arranged.layout }, pack)).length;
    setMap(arranged.map, arranged.layout);
    setResult({ ...arranged, seated, unknown: parsed.unknown, offExpansion: parsed.offExpansion });
    setConfirming(false);
    setText('');
  };
  const onApply = () => (mapIsEmpty(game, pack) ? apply() : setConfirming(true));

  return (
    <div className="map-import" role="group" aria-label={t('mapImport.title')}>
      <div className="panel-head">
        <strong>{t('mapImport.title')}</strong>
        <HexRemove label={t('map.sheet.close')} onClick={onClose} />
      </div>
      <textarea
        aria-label={t('mapImport.field')} placeholder={t('mapImport.placeholder')} rows={4} value={text}
        onChange={e => { setText(e.target.value); setConfirming(false); }}
      />
      {off.map(id => (
        <div key={id} className="row">
          <span className="muted">{t('mapImport.offExpansion', { list: parsed.offExpansion[id]!.join(', '), name: EXPANSION_NAMES[id] })}</span>
          <button type="button" onClick={() => turnOn(id)}>{t('mapImport.turnOn', { name: EXPANSION_NAMES[id] })}</button>
        </div>
      ))}
      {isSet && <p className="muted">{t('mapImport.set', { n: parsed.set.length })}</p>}
      {otherLayout && <p className="muted" role="status">{t('mapImport.layoutLocked', { name: t(`layout.${arranged.layout}`) })}</p>}
      {confirming ? (
        <ConfirmBar
          className="player-confirm" text={t('mapImport.confirm')} yes={t('mapImport.replace')} no={t('mapImport.cancel')}
          onYes={apply} onNo={() => setConfirming(false)}
        />
      ) : (
        <div className="row">
          <button type="button" className="primary" disabled={nothing || otherLayout} onClick={onApply}>{t(isSet ? 'mapImport.arrange' : 'mapImport.apply')}</button>
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
          {result.seated > 0 && <p>{t('mapImport.homesSeated', { n: result.seated })}</p>}
          {result.homes === 0 && result.seated === 0 && <p>{t('mapImport.homesEmpty')}</p>}
        </div>
      )}
    </div>
  );
}
