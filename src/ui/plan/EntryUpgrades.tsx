import { useTranslation } from 'react-i18next';
import { hasLevelTwo, SHIP_KINDS } from '../../domain/unitStats';
import type { DataPack, Game, UnitId } from '../../domain/types';
import { UnitIcon } from '../players/UnitIcon';

export interface EntryUpgradesProps {
  /** What this entry upgrades. */
  upgrades: UnitId[];
  /** What the player has just before this entry. */
  before: UnitId[];
  game: Game;
  pack: DataPack;
  onChange: (upgrades: UnitId[]) => void;
}

/** The ships a Technology entry upgrades. */
export function EntryUpgrades({ upgrades, before, game, pack, onChange }: EntryUpgradesProps) {
  const { t } = useTranslation();
  const toggle = (unit: UnitId) => onChange(upgrades.includes(unit) ? upgrades.filter(id => id !== unit) : [...upgrades, unit]);
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
