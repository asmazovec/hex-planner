import { useTranslation } from 'react-i18next';
import { techSummary } from '../../data/techSummaries';
import type { DataPack, FactionDef, UnitId } from '../../domain/types';
import { currentLanguage } from '../../i18n';
import { UNIT_ORDER } from '../map/UnitGlyph';
import { UnitIcon } from '../players/UnitIcon';

const HEX_POINTS = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 3) * i;
  return `${(75 + 64 * Math.cos(angle)).toFixed(1)},${(66 + 64 * Math.sin(angle)).toFixed(1)}`;
}).join(' ');

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

function Tech({ id, pack }: { id: string; pack: DataPack }) {
  const tech = pack.technologies[id];
  return (
    <div className={`tech tech-${tech.type}`}>
      <b>{tech.name}</b>
      <p>{techSummary(id, currentLanguage())}</p>
    </div>
  );
}

export interface FactionCardProps {
  faction: FactionDef;
  pack: DataPack;
}

/** What a faction starts with, all visible at once. Colours come from `--player` of the surrounding card. */
export function FactionCard({ faction, pack }: FactionCardProps) {
  const { t } = useTranslation();
  const ships = UNIT_ORDER.filter((unit: UnitId) => (faction.startUnits[unit] ?? 0) > 0);
  const choice = faction.startingTechChoice;
  return (
    <div className="player-body">
      <div>
        <div className="player-sec">{t('players.home')}</div>
        <HomeHex faction={faction} pack={pack} />
      </div>
      <div>
        <div className="player-sec">{t('players.start')}</div>
        <div className="ship-list">
          {ships.map(unit => (
            <div key={unit} className="ship" data-testid="ship">
              <UnitIcon unit={unit} />
              <span>{t(`unit.${unit}`)}</span>
              <b>{faction.startUnits[unit]}</b>
            </div>
          ))}
        </div>
        <div className="player-stat"><span>{t('players.commodities')}</span><b>{faction.commodities}</b></div>
      </div>
      <div>
        <div className="player-sec">{t('players.tech')}</div>
        {faction.startingTech.map(id => <Tech key={id} id={id} pack={pack} />)}
        {choice && (
          <p className="tech-choice">
            {choice.options.length > 0
              ? t('players.techChoice', { amount: choice.amount })
              : t('players.techChoiceAny', { amount: choice.amount })}
          </p>
        )}
        {choice?.options.map(id => <Tech key={id} id={id} pack={pack} />)}
        {faction.startingTech.length === 0 && !choice && <p className="tech-choice">{t('players.techNone')}</p>}
      </div>
    </div>
  );
}
