import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hasLevelTwo, SHIP_KINDS } from '../../domain/unitStats';
import type { DataPack, Game, UnitId } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { UnitIcon } from '../players/UnitIcon';

export interface EntryUpgradesProps {
  entryId: string;
  /** What this entry upgrades. */
  upgrades: UnitId[];
  /** What the player has just before this entry. */
  before: UnitId[];
  game: Game;
  pack: DataPack;
}

/** Ships a strategic or secondary entry upgrades: a single line until opened or marked, to keep the list light. */
export function EntryUpgrades({ entryId, upgrades, before, game, pack }: EntryUpgradesProps) {
  const { t } = useTranslation();
  const updateEntry = useGame(s => s.updateEntry);
  const [open, setOpen] = useState(false);
  const toggle = (unit: UnitId) => {
    const next = upgrades.includes(unit) ? upgrades.filter(id => id !== unit) : [...upgrades, unit];
    updateEntry(entryId, { upgrades: next.length > 0 ? next : undefined });
  };
  if (!open && upgrades.length === 0) {
    return <button type="button" className="entry-upgrade-line" onClick={() => setOpen(true)}>{t('ships.entryUpgrade')}</button>;
  }
  return (
    <div
      className="entry-upgrades" role="group" aria-label={t('ships.entryUpgrade')}
      style={{ '--player': `var(--player-${game.color})` } as React.CSSProperties}
    >
      {SHIP_KINDS.filter(kind => hasLevelTwo(game.faction, kind, pack)).map(kind => {
        const marked = upgrades.includes(kind);
        const owned = !marked && before.includes(kind);
        return (
          <button
            key={kind} type="button" aria-label={t(`unit.${kind}`)} title={owned ? t('ships.owned') : t(`unit.${kind}`)} aria-pressed={marked}
            className={owned ? 'entry-upgrade-owned' : undefined} disabled={owned} onClick={() => toggle(kind)}
          >
            <UnitIcon unit={kind} />
          </button>
        );
      })}
    </div>
  );
}
