import { useTranslation } from 'react-i18next';
import { textOf } from '../../domain/components';
import type { DataPack, ExpansionId, FactionDef, UnitId } from '../../domain/types';
import { hexPoints } from '../map/geometry';
import { UNIT_ORDER } from '../units/unitOrder';
import { UnitIcon } from '../units/UnitIcon';
import { FactionComponents } from './FactionComponents';
import { ShipStats, type ShipStatsProps } from './ShipStats';
import { SectionTitle } from '../primitives/SectionTitle';

/** The home tile: a hex of radius 64 around the middle of the picture. */
const HEX_POINTS = hexPoints(64, { x: 75, y: 66 }, 1);

/** Places of one, two and three planets on the hex; three leave room for the tile number. */
const PLACES: [number, number][][] = [[[75, 66]], [[47, 66], [103, 66]], [[75, 44], [46, 84], [104, 84]]];

/** Two planets stand side by side: a long name takes two lines so the neighbours do not touch. */
const LONG_NAME = 10;
const nameLines = (name: string, planets: number): string[] => {
  if (planets !== 2 || name.length <= LONG_NAME) return [name];
  const lines: string[] = [];
  for (const word of name.split(' ')) {
    const last = lines.at(-1);
    if (last !== undefined && last.length + word.length < LONG_NAME) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
};

const STRUCTURES = [{ kind: 'spacedock', name: 'map.spaceDock' }, { kind: 'pds', name: 'map.pds' }] as const;

function HomeHex({ faction, pack }: { faction: FactionDef; pack: DataPack }) {
  const { t } = useTranslation();
  const tile = pack.tiles[faction.homeTile];
  const planets = tile.planetIds.flatMap(id => pack.planets[id] ?? []);
  const places = PLACES[planets.length - 1] ?? [];
  const three = planets.length === 3;
  const radius = three ? 13 : 19;
  return (
    <svg className="home-hex" viewBox="0 0 150 132" width="150" height="132" role="img" aria-label={t('players.home')}>
      <polygon points={HEX_POINTS} className="home-hex-tile" />
      <text x="75" y="24" className="home-hex-number">{tile.number}</text>
      {planets.map((planet, i) => {
        const [x, y] = places[i] ?? [75, 66];
        return (
          <g key={planet.id}>
            <circle cx={x} cy={y} r={radius} className="home-hex-planet" />
            <text x={x} y={y + (three ? 4 : 5)} className="home-hex-values" fontSize={three ? 11 : 14}>
              <tspan className="value-resources">{planet.resources}</tspan>
              <tspan className="home-hex-slash">/</tspan>
              <tspan className="value-influence">{planet.influence}</tspan>
            </text>
            <text x={x} y={y + radius + 11} className="home-hex-name">
              {nameLines(planet.name, planets.length).map((line, n) => (
                <tspan key={line} x={x} dy={n === 0 ? 0 : 10}>{line}</tspan>
              ))}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Tech({ id, pack, chosen, onPick }: { id: string; pack: DataPack; chosen?: boolean; onPick?: () => void }) {
  const tech = pack.technologies[id];
  const body = (
    <>
      <b>{tech.name}</b>
      <p>{textOf(pack, `technology:${id}`)}</p>
    </>
  );
  // A technology of a choice at setup is a toggle: the one the player took is chosen.
  if (onPick) return <button type="button" className={`tech tech-pick tech-${tech.type}`} aria-pressed={chosen === true} onClick={onPick}>{body}</button>;
  return <div className={`tech tech-${tech.type}`}>{body}</div>;
}

export interface FactionCardProps {
  faction: FactionDef;
  pack: DataPack;
  /** Choose which leaders, mechs and breakthroughs the card shows. */
  expansions: ExpansionId[];
  /** Current values on the plan screen; without it the table shows base values, read only. */
  live?: Pick<ShipStatsProps, 'upgraded' | 'locked'> & { /** Space docks and PDS this player has on the board in the state shown. */ structures?: { docks: number; pds: number } };
  /** The technologies of the faction's choice that the player took, and what a press on one does: with it the choice is made here. */
  chosen?: readonly string[];
  onChoose?: (id: string, take: boolean) => void;
}

/** What a faction starts with, all visible at once. Colours come from `--player` of the surrounding card. */
export function FactionCard({ faction, pack, expansions, live, chosen, onChoose }: FactionCardProps) {
  const { t } = useTranslation();
  const ships = UNIT_ORDER.filter((unit: UnitId) => (faction.startUnits[unit] ?? 0) > 0);
  const choice = faction.startingTechChoice;
  return (
    <div className="player-body">
      <div>
        <SectionTitle as="div" className="player-sec">{t('players.home')}</SectionTitle>
        <HomeHex faction={faction} pack={pack} />
      </div>
      <div>
        <SectionTitle as="div" className="player-sec">{t('players.start')}</SectionTitle>
        <div className="ship-list">
          {ships.map(unit => (
            <div key={unit} className="ship" data-testid="ship">
              <UnitIcon unit={unit} />
              <span>{t(`unit.${unit}`)}</span>
              <b>{faction.startUnits[unit]}</b>
            </div>
          ))}
          {/* Structures are not units of the start fleet (`startStructures`): the sheet's stand in the column like the units. */}
          {STRUCTURES.map(({ kind, name }) => {
            const count = faction.startStructures?.[kind] ?? 0;
            return count === 0 ? null : (
              <div key={kind} className="ship" data-testid="structure">
                <UnitIcon unit={kind} />
                <span>{t(name)}</span>
                <b>{count}</b>
              </div>
            );
          })}
        </div>
        {/* On the plan screen: how many the player has on the board in the state shown, against the supply (LRR 96.2). */}
        {live?.structures && (
          <div className="player-stat">
            {STRUCTURES.map(({ kind, name }) => (
              <span key={kind} data-testid="onboard">
                {t(name)} <b>{live.structures![kind === 'spacedock' ? 'docks' : 'pds']} / {pack.structures.find(st => st.id === kind)?.limit}</b>
              </span>
            ))}
          </div>
        )}
      </div>
      <div>
        <SectionTitle as="div" className="player-sec">{t('players.tech')}</SectionTitle>
        {faction.startingTech.map(id => <Tech key={id} id={id} pack={pack} />)}
        {choice && (
          <p className="tech-choice">
            {choice.options.length > 0
              ? t('players.techChoice', { amount: choice.amount })
              : t('players.techChoiceAny', { amount: choice.amount })}
          </p>
        )}
        {choice?.options.map(id => (
          <Tech key={id} id={id} pack={pack} chosen={chosen?.includes(id)} onPick={onChoose && (() => onChoose(id, !chosen?.includes(id)))} />
        ))}
        {faction.startingTech.length === 0 && !choice && <p className="tech-choice">{t('players.techNone')}</p>}
      </div>
      <div className="player-ships">
        <FactionComponents faction={faction} expansions={expansions} pack={pack} />
      </div>
      <div className="player-ships">
        <SectionTitle as="div" className="player-sec">{t('ships.title')}</SectionTitle>
        <ShipStats factionId={faction.id} pack={pack} {...live} />
      </div>
    </div>
  );
}
