import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame, type GameStore } from '../../state/gameStore';
import { WarningList } from '../feedback/WarningText';
import { Modal } from '../overlays/Modal';

function ConflictDialog({ conflict }: { conflict: NonNullable<GameStore['linkConflict']> }) {
  const { t } = useTranslation();
  const resolve = useGame(s => s.resolveLinkConflict);
  const [name, setName] = useState(`${conflict.name} 2`);
  const wanted = name.trim();
  const taken = conflict.taken.includes(wanted);
  // TODO(P2-452) #ws:ui-containers #type:ui #size:s #modal — модал собран руками (.stage + .link-dialog) без Escape и шапки с HexRemove, третья копия рядом с HexStage и FactionPicker: общий Modal (аудит 3.5) — P2 note: now the shared Modal; a head with HexRemove (and Escape closing it) would add a third way out of the choice and a new head row: needs prototype
  return (
    <Modal label={t('share.title')} className="link-dialog">
        <strong>{t('share.title')}</strong>
        <p>{t('share.differs', { name: conflict.name, list: conflict.differences.map(key => t(`share.diff.${key}`)).join(', ') })}</p>
        <label className="field">
          {t('share.newName')}
          <input type="text" value={name} onChange={e => setName(e.target.value)} />
        </label>
        {taken && <WarningList message={t('share.nameTaken')} />}
        <button type="button" className="primary" disabled={wanted === '' || taken} onClick={() => void resolve({ newName: wanted })}>{t('share.createNew')}</button>
        <button type="button" onClick={() => void resolve({ keepSaved: true })}>{t('share.keepSaved')}</button>
    </Modal>
  );
}

/** A link names a saved game but says something else about it: nothing changes until the player chooses. */
export function ShareConflict() {
  const conflict = useGame(s => s.linkConflict);
  return conflict ? <ConflictDialog key={conflict.savedId} conflict={conflict} /> : null;
}
