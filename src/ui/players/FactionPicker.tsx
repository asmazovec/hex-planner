import { useEffect, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { loadPack } from '../../data/loadPack';
import type { FactionDef } from '../../domain/types';
import { HexRemove } from '../plan/RowIcon';

const baseFactions = loadPack([]).factions;
const pokFactions = loadPack(['pok']).factions;

export interface FactionPickerProps {
  /** Says whose faction this is. */
  label: string;
  value: string;
  /** What can be chosen, in the order to show. */
  factions: FactionDef[];
  /** Faction ids other players hold. */
  taken: Set<string>;
  /** Whether the choice can be taken back to none. */
  clearable: boolean;
  onPick: (faction: string) => void;
}

/** The faction of a player: a line of text that opens a sheet with all factions at once, by expansion, with room for a finger. */
export function FactionPicker({ label, value, factions, taken, clearable, onPick }: FactionPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const shown = factions.find(f => f.id === value);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const groups = [
    { title: t('players.base'), list: factions.filter(f => baseFactions[f.id]) },
    { title: 'Prophecy of Kings', list: factions.filter(f => !baseFactions[f.id] && pokFactions[f.id]) },
    { title: "Thunder's Edge", list: factions.filter(f => !baseFactions[f.id] && !pokFactions[f.id]) },
  ].filter(group => group.list.length > 0);
  const choose = (id: string) => {
    onPick(id);
    setOpen(false);
  };
  const closeOutside = (e: MouseEvent) => { if (e.target === e.currentTarget) setOpen(false); };

  return (
    <>
      <button type="button" className="fac fac-button" aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        {shown?.name ?? t('players.choose')}
      </button>
      {open && createPortal(
        <div className="stage" onClick={closeOutside}>
          <div className="fac-sheet" role="dialog" aria-modal="true" aria-label={t('players.chooseFor', { who: label })}>
            <div className="stage-head">
              <strong>{label}</strong>
              <HexRemove label={t('map.sheet.close')} onClick={() => setOpen(false)} />
            </div>
            {groups.map(group => (
              <section key={group.title} aria-label={group.title}>
                <h3 className="fac-group">{group.title}</h3>
                <div className="fac-options">
                  {group.list.map(faction => (
                    <button
                      key={faction.id} type="button" className="fac-option" data-faction={faction.id} aria-pressed={faction.id === value}
                      disabled={taken.has(faction.id)} onClick={() => choose(faction.id)}
                    >
                      {faction.name}
                      {taken.has(faction.id) && <small>{t('players.taken')}</small>}
                    </button>
                  ))}
                </div>
              </section>
            ))}
            {clearable && value !== '' && <button type="button" className="fac-clear" onClick={() => choose('')}>{t('players.noFaction')}</button>}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
