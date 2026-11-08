import { useTranslation } from 'react-i18next';
import { shipSummary } from '../../data/shipSummaries';
import { hasLevelTwo, isUniqueShip, SHIP_KINDS, unitStats } from '../../domain/unitStats';
import type { DataPack, ShipStats as Stats, UnitId, UnitRoll } from '../../domain/types';
import { currentLanguage } from '../../i18n';
import { UnitIcon } from '../players/UnitIcon';

const NONE = '—';
const rollText = ({ hit, dice }: UnitRoll): string => (dice > 1 ? `${hit}×${dice}` : `${hit}`);

const STAT_KEYS = ['cost', 'capacity', 'combat', 'move'] as const;
type StatKey = typeof STAT_KEYS[number];
/** A fighter costs 1 for 2. The Winnu flagship's dice depend on the battle: its 0 dice show as the plain combat value. */
const STAT_TEXT: Record<StatKey, (stat: Stats) => string> = {
  cost: stat => (stat.cost === 0.5 ? '½' : `${stat.cost}`),
  capacity: stat => (stat.capacity > 0 ? `${stat.capacity}` : NONE),
  combat: stat => (stat.combat === null ? NONE : rollText({ hit: stat.combat, dice: stat.dice })),
  move: stat => (stat.move === null ? NONE : `${stat.move}`),
};

/** A value at the current level; one that differs from the base level is gold, with the old value before it. */
export function StatValue({ name, base, current }: { name: StatKey; base: Stats; current: Stats }) {
  const was = STAT_TEXT[name](base);
  const now = STAT_TEXT[name](current);
  return was === now ? <>{now}</> : <>{was} → <em>{now}</em></>;
}

/** One value with its label, for the cards of the upgrades panel. */
export function StatLine({ base, current }: { base: Stats; current: Stats }) {
  const { t } = useTranslation();
  return (
    <span className="ship-stat-line">
      {STAT_KEYS.map(name => <span key={name}>{t(`ships.${name}`)} <b><StatValue name={name} base={base} current={current} /></b></span>)}
    </span>
  );
}

/** Properties and the retelling of a ship at a level. Shown only: nothing here is calculated. */
export function ShipNotes({ stat }: { stat: Stats }) {
  const { t } = useTranslation();
  const summary = shipSummary(stat.id, currentLanguage());
  const labels = [
    stat.sustain && t('ships.sustain'),
    stat.barrage && t('ships.barrage', { value: rollText(stat.barrage) }),
    stat.bombard && t('ships.bombard', { value: rollText(stat.bombard) }),
    stat.cannon && t('ships.cannon', { value: rollText(stat.cannon) }),
  ].filter((label): label is string => Boolean(label));
  if (labels.length === 0 && !summary) return null;
  return (
    <span className="ship-notes">
      {labels.map(label => <span key={label} className="ship-prop">{label}</span>)}
      {summary && <small>{summary}</small>}
    </span>
  );
}

export interface ShipStatsProps {
  factionId: string;
  pack: DataPack;
  /** The player's upgraded types; none means base values. */
  upgraded?: UnitId[];
  /** With it, a tap on a row with a level II toggles it; without it the table is read only. */
  onToggle?: (unit: UnitId) => void;
  /** Types an entry of the plan upgraded, not to toggle here, with the round. */
  locked?: Partial<Record<UnitId, number>>;
}

// TODO(P2-376) #ws:ui-structure #type:arch #size:s #dep:P2-373 — ShipStats не относится к плану (FactionCard, map/UpgradesPanel); в players/
/** A player's ships: cost, capacity, combat and move at the current level, then properties and the retelling. */
export function ShipStats({ factionId, pack, upgraded = [], onToggle, locked = {} }: ShipStatsProps) {
  const { t } = useTranslation();
  return (
    <div className="ship-table">
      <div className="ship-table-head">
        <span />
        {STAT_KEYS.map(name => <span key={name}>{t(`ships.${name}`)}</span>)}
      </div>
      {SHIP_KINDS.map(kind => {
        const base = unitStats(factionId, kind, false, pack);
        const current = unitStats(factionId, kind, upgraded.includes(kind), pack);
        if (!base || !current) return null;
        const round = locked[kind];
        const on = current !== base;
        const content = (
          <>
            <UnitIcon unit={kind} />
            <span className="ship-row-name">
              <b>{t(`unit.${kind}`)}</b>
              {isUniqueShip(factionId, kind, pack) && <small>{current.name}</small>}
              {round !== undefined && <small className="ship-row-round">{t('ships.fromRound', { n: round })}</small>}
            </span>
            {STAT_KEYS.map(name => (
              <span key={name} className="ship-row-value"><StatValue name={name} base={base} current={current} /></span>
            ))}
            <ShipNotes stat={current} />
          </>
        );
        const id = `ship-row-${kind}`;
        return onToggle ? (
          <button
            key={kind} type="button" className={`ship-row ship-row-live${on ? ' on' : ''}`} data-testid={id} aria-pressed={on}
            disabled={!hasLevelTwo(factionId, kind, pack) || round !== undefined} onClick={() => onToggle(kind)}
          >
            {content}
          </button>
        ) : <div key={kind} className="ship-row" data-testid={id}>{content}</div>;
      })}
    </div>
  );
}
