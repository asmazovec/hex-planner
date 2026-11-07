import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame, type GameStore } from '../../state/gameStore';

function ConflictDialog({ conflict }: { conflict: NonNullable<GameStore['linkConflict']> }) {
  const { t } = useTranslation();
  const resolve = useGame(s => s.resolveLinkConflict);
  const [name, setName] = useState(`${conflict.name} 2`);
  const wanted = name.trim();
  const taken = conflict.taken.includes(wanted);
  return (
    <div className="stage">
      <div className="link-dialog" role="dialog" aria-modal="true" aria-label={t('share.title')}>
        <strong>{t('share.title')}</strong>
        <p>{t('share.differs', { name: conflict.name, list: conflict.differences.map(key => t(`share.diff.${key}`)).join(', ') })}</p>
        <label className="field">
          {t('share.newName')}
          <input type="text" value={name} onChange={e => setName(e.target.value)} />
        </label>
        {taken && <p className="warning-text place-warnings">{t('share.nameTaken')}</p>}
        <button type="button" className="primary" disabled={wanted === '' || taken} onClick={() => void resolve({ newName: wanted })}>{t('share.createNew')}</button>
        <button type="button" onClick={() => void resolve({ keepSaved: true })}>{t('share.keepSaved')}</button>
      </div>
    </div>
  );
}

/** A link names a saved game but says something else about it: nothing changes until the player chooses. */
export function ShareConflict() {
  const conflict = useGame(s => s.linkConflict);
  return conflict ? <ConflictDialog key={conflict.savedId} conflict={conflict} /> : null;
}
