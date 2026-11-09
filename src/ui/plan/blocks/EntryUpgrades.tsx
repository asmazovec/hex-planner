import { useTranslation } from 'react-i18next';
import { hasLevelTwo, SHIP_KINDS, upgradableStructures } from '../../../domain/unitStats';
import type { DataPack, Game, UpgradeId } from '../../../domain/types';
import { UnitIcon } from '../../units/UnitIcon';
import { playerStyle } from '../../primitives/player';

export interface EntryUpgradesProps {
  /** What this entry upgrades. */
  upgrades: UpgradeId[];
  /** What the player has just before this entry. */
  before: UpgradeId[];
  game: Game;
  pack: DataPack;
  onChange: (upgrades: UpgradeId[]) => void;
}

/**
 * What a Technology entry upgrades, a row per kind so the row fits: ships, then ground forces, then structures. A kind
 * with nothing to upgrade has no row.
 */
export function EntryUpgrades({ upgrades, before, game, pack, onChange }: EntryUpgradesProps) {
  const { t } = useTranslation();
  const units = SHIP_KINDS.filter(kind => hasLevelTwo(game.faction, kind, pack));
  const rows: { key: string; kinds: UpgradeId[] }[] = [
    { key: 'ships', kinds: units.filter(kind => !pack.units[kind]?.ground) },
    { key: 'ground', kinds: units.filter(kind => pack.units[kind]?.ground) },
    { key: 'structures', kinds: upgradableStructures(pack) },
  ];
  const name = (kind: UpgradeId) => (kind === 'pds' ? t('map.pds') : kind === 'spacedock' ? t('map.spaceDock') : t(`unit.${kind}`));
  const toggle = (unit: UpgradeId) => onChange(upgrades.includes(unit) ? upgrades.filter(id => id !== unit) : [...upgrades, unit]);
  return (
    <div
      className="entry-upgrades" role="group" aria-label={t('ships.entryUpgrade')}
      style={playerStyle('--player', game.color)}
    >
      {rows.filter(row => row.kinds.length > 0).map(row => (
        <div key={row.key} className="entry-upgrade-row" role="group" aria-label={t(`ships.upgradeRow.${row.key}`)}>
          <small className="entry-upgrade-label" aria-hidden="true">{t(`ships.upgradeRow.${row.key}`)}</small>
          <div className="entry-upgrade-buttons">
            {row.kinds.map(kind => {
              const marked = upgrades.includes(kind);
              const owned = !marked && before.includes(kind);
              return (
                <button
                  key={kind} type="button" aria-label={name(kind)} title={owned ? t('ships.owned') : name(kind)} aria-pressed={marked}
                  className={owned ? 'entry-upgrade-owned' : undefined} disabled={owned} onClick={() => toggle(kind)}
                >
                  <UnitIcon unit={kind} />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
