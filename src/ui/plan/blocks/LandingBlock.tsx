import { useTranslation } from 'react-i18next';
import { opponentsBySeat } from '../../../domain/players';
import type { Game, GameState, PlanetDef, UnitCounts, UnitId } from '../../../domain/types';
import { PlanetMark } from '../../map/TileView';
import { playerColour, tokenColours } from '../../units/sprites';
import { UnitTile } from '../../units/UnitTile';

export interface LandingBlockProps {
  game: Game;
  planets: PlanetDef[];
  /** The state just before the action: who stands on the planets and how they are now. */
  before: GameState;
  /** Ground units that reach the landing, by type, and how many of each. */
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
export function LandingBlock({ game, planets, before, units, arrived, lost = {}, landedOn, onLand }: LandingBlockProps) {
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
        // TODO(P2-359) #ws:ui-logic-to-domain #type:arch #duplicate-of-domain #dep:P2-313 — кто остался на планете после потерь считает UI; брать состояние после боя из домена
        const left = (unit: UnitId) => (before.ground[planet.id]?.[unit] ?? 0) - (lost[planet.id]?.[unit] ?? 0);
        const standing = (Object.keys(before.ground[planet.id] ?? {}) as UnitId[]).filter(unit => left(unit) > 0);
        // TODO(P2-360) #ws:rivals #type:check #rivals — чужие войска берутся из game.enemyGround (расстановка), а не из состояния соперников по плану (state.rivals): их высадки раньше в плане не видны — P2 note: rivals wave did the domain side (route blockers from the replay, gameAs opponents); this block gets only the owner's `before`, which lacks the other players' ground (for a rival's entry mine is nowhere in it), so it needs the full replay state passed in — a props change of a ui-containers file, left to the UI wave
        const enemies = opponentsBySeat(game).flatMap(o => (Object.keys(game.enemyGround[planet.id]?.[o.id] ?? {}) as UnitId[])
          .filter(unit => (game.enemyGround[planet.id]?.[o.id]?.[unit] ?? 0) > 0)
          .map(unit => ({ owner: o.id, unit, count: game.enemyGround[planet.id]?.[o.id]?.[unit] ?? 0 })));
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
