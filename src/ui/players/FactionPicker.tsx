import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadPack } from '../../data/loadPack';
import type { FactionDef } from '../../domain/types';
import { EXPANSION_NAMES } from '../common/expansions';
import { Modal } from '../overlays/Modal';
import { SectionTitle } from '../primitives/SectionTitle';

// TODO(P2-457) #ws:ui-logic-to-domain #type:arch #size:s #faction-groups — дополнение фракции выясняется тремя loadPack и вычитанием наборов: дополнение фракции из домена (factionSheet)
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

  const groups = [
    { title: t('players.base'), list: factions.filter(f => baseFactions[f.id]) },
    { title: EXPANSION_NAMES.pok, list: factions.filter(f => !baseFactions[f.id] && pokFactions[f.id]) },
    { title: EXPANSION_NAMES.te, list: factions.filter(f => !baseFactions[f.id] && !pokFactions[f.id]) },
  ].filter(group => group.list.length > 0);
  const choose = (id: string) => {
    onPick(id);
    setOpen(false);
  };
  const close = () => setOpen(false);

  return (
    <>
      <button type="button" className="fac fac-button" aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        {shown?.name ?? t('players.choose')}
      </button>
      {open && (
        <Modal label={t('players.chooseFor', { who: label })} className="fac-sheet" title={label} onClose={close} portal>
        {groups.map(group => (
          <section key={group.title} aria-label={group.title}>
            <SectionTitle className="fac-group">{group.title}</SectionTitle>
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
        </Modal>
      )}
    </>
  );
}
