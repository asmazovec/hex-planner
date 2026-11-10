import { useTranslation } from 'react-i18next';
import { hasLevelTwo, isUniqueShip, SHIP_KINDS, unitStats } from '../../domain/unitStats';
import type { DataPack, Game, UnitId, UpgradeId } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { UnitIcon } from '../units/UnitIcon';
import { ShipNotes, StatLine } from '../players/ShipStats';
import { DrawerSheet } from '../overlays/Drawer';
import { playerStyle } from '../primitives/player';

export interface UpgradesPanelProps {
  game: Game;
  pack: DataPack;
  /** My upgraded types in the state the map shows. */
  upgraded: UpgradeId[];
  /** Types an entry of the plan upgraded, not to toggle here, with the round. */
  locked: Partial<Record<UnitId, number>>;
}

/** My ships, one card per type: a tap toggles the baseline between levels I and II. */
export function UpgradesPanel({ game, pack, upgraded, locked }: UpgradesPanelProps) {
  const { t } = useTranslation();
  const toggleUpgrade = useGame(s => s.toggleUpgrade);
  return (
    <DrawerSheet className="upgrades-panel" title={t('ships.upgrades')} style={playerStyle('--player', game.color)}>
      {SHIP_KINDS.map(kind => {
        const base = unitStats(game.faction, kind, false, pack);
        const current = unitStats(game.faction, kind, upgraded.includes(kind), pack);
        if (!base || !current) return null;
        const hasTwo = hasLevelTwo(game.faction, kind, pack);
        const on = current !== base;
        const round = locked[kind];
        return (
          <button
            key={kind} type="button" className={`upgrade-card${on ? ' on' : ''}`} data-testid={`upgrade-${kind}`} aria-pressed={on}
            disabled={!hasTwo || round !== undefined} onClick={() => toggleUpgrade('me', kind)}
          >
            <UnitIcon unit={kind} />
            <span className="upgrade-body">
              <b>{t(`unit.${kind}`)}</b>
              {isUniqueShip(game.faction, kind, pack) && <small>{current.name}</small>}
              {round !== undefined && <small className="ship-row-round">{t('ships.fromRound', { n: round })}</small>}
              <StatLine base={base} current={current} />
              <ShipNotes stat={current} pack={pack} />
            </span>
            <span className="upgrade-level">{hasTwo ? (on ? 'II' : 'I') : '—'}</span>
          </button>
        );
      })}
    </DrawerSheet>
  );
}
