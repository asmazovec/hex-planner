import { useTranslation } from 'react-i18next';
import { othersOnPlanet } from '../../../domain/stacks';
import { standingAfterBattle } from '../../../domain/tactical';
import type { Game, GameState, PlanetDef, UnitCounts, UnitId } from '../../../domain/types';
import { PlanetMark } from '../../map/TileView';
import { playerColour, tokenColours } from '../../units/sprites';
import { UnitTile } from '../../units/UnitTile';

export interface LandingBlockProps {
  game: Game;
  planets: PlanetDef[];
  /** The state just before the action: who stands on the planets and how they are now. */
  before: GameState;
  /** The whole board just before the action, the opponents in `rivals`: the others' ground forces come from it. */
  board?: GameState;
  /** Ground forces that reach the landing, by type, and how many of each. */
  units: UnitId[];
  arrived: UnitCounts;
  /** Who fell in the battle among those already standing there, by planet: the stacks show who is left. */
  lost?: Record<string, UnitCounts>;
  landedOn: (planetId: string, unit: UnitId) => number;
  onLand: (planetId: string, unit: UnitId, count: number) => void;
}

const PLANET_PX = 52;

/**
 * The landing goes like the cargo of a flight, planet by planet: beside each planet the units free to land, and after a
 * tap the taken picture with its count; a tap on that takes one back. Nothing forbids landing more than arrived.
 */
export function LandingBlock({ game, planets, before, board, units, arrived, lost = {}, landedOn, onLand }: LandingBlockProps) {
  const { t } = useTranslation();
  const colours = tokenColours(game);
  const colour = playerColour(game.color);
  const unitName = (unit: UnitId) => t(`unit.${unit}`);
  const landedInAll = (unit: UnitId) => planets.reduce((sum, p) => sum + landedOn(p.id, unit), 0);

  return (
    <div className="landing">
      {planets.map(planet => {
        const control = before.control[planet.id];
        const exhausted = before.exhausted.includes(planet.id);
        const facts = [
          t(exhausted ? 'map.sheet.exhausted' : 'map.sheet.ready'),
          ...(control ? [t(`map.control.${control}`)] : []),
        ].join(' · ');
        const after = standingAfterBattle(before, planet.id, lost);
        const left = (unit: UnitId) => after[unit] ?? 0;
        const standing = Object.keys(after) as UnitId[];
        const enemies = othersOnPlanet(game, board, planet.id);
        return (
          <div key={planet.id} className="landing-planet" role="group" aria-label={t('plan.tactical.landingOn', { planet: planet.name })}>
            <div className="landing-target">
              <svg viewBox="-12 -12 24 24" width={PLANET_PX} height={PLANET_PX} aria-hidden="true">
                {/* The numbers of a planet take their size from the tile they stand on. */}
                <g className="tile">
                  <g className={`planet${exhausted ? ' planet-exhausted' : ''}`} data-control={control ?? 'none'} data-exhausted={exhausted ? 'true' : 'false'}>
                    <PlanetMark planet={planet} control={control} exhausted={exhausted} />
                  </g>
                </g>
              </svg>
              <span>
                <strong>{planet.name}</strong>
                <small>{facts}</small>
              </span>
            </div>
            <div className="pics">
              {units.map(unit => {
                const got = landedOn(planet.id, unit);
                return (
                  <span key={unit} className="pic-pair">
                    <UnitTile
                      variant="take" kind={unit} count={Math.max(0, (arrived[unit] ?? 0) - landedInAll(unit))} colour={colour} showOne
                      label={t('plan.tactical.landOne', { unit: unitName(unit) })} onClick={() => onLand(planet.id, unit, got + 1)}
                    />
                    {got > 0 && (
                      <UnitTile
                        variant="taken" kind={unit} count={got} colour={colour} showOne
                        label={t('stage.giveBack', { unit: unitName(unit) })} onClick={() => onLand(planet.id, unit, got - 1)}
                      />
                    )}
                  </span>
                );
              })}
            </div>
            {(standing.length > 0 || enemies.length > 0) && (
              <div className="landing-stacks">
                {standing.map(unit => <UnitTile key={unit} variant="stack" kind={unit} colour={colour} count={left(unit)} label={`${unitName(unit)} ×${left(unit)}`} />)}
                {enemies.map(({ owner, unit, count }) => <UnitTile key={`${owner}:${unit}`} variant="stack" kind={unit} colour={colours[owner]} count={count} label={`${unitName(unit)} ×${count}`} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
