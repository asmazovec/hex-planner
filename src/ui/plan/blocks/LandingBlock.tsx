import { useTranslation } from 'react-i18next';
import { othersOnPlanet } from '../../../domain/stacks';
import { standingAfterBattle } from '../../../domain/tactical';
import type { Game, GameState, PlanetDef, StructureCounts, StructureKind, UnitCounts, UnitId } from '../../../domain/types';
import { PlanetBadge } from '../../map/PlanetBadge';
import { playerColour, tokenColours } from '../../units/sprites';
import { UnitDraft, type UnitDraftRow } from '../../units/UnitDraft';
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
  /** The structures that stand in the space area after the flights, and where the action puts them at its end; without it the rows hold ground forces only. */
  structures?: {
    arrived: StructureCounts;
    landedOn: (planetId: string, kind: StructureKind) => number;
    onLand: (planetId: string, kind: StructureKind, count: number) => void;
  };
}

const STRUCTURES: StructureKind[] = ['pds', 'spacedock'];
const isStructure = (kind: string): kind is StructureKind => kind === 'pds' || kind === 'spacedock';

/**
 * The landing is one draft with a row per planet: the stock is what arrived, less what landed on every planet, so a
 * kind that ran out changes its look in all the rows at once and counts what lands beyond it (the domain warns, nothing is forbidden); the tray of a row holds what lands there.
 */
export function LandingBlock({ game, planets, before, board, units, arrived, lost = {}, landedOn, onLand, structures }: LandingBlockProps) {
  const { t } = useTranslation();
  const colours = tokenColours(game);
  const colour = playerColour(game.color);
  const unitName = (unit: UnitId) => t(`unit.${unit}`);
  const landedInAll = (unit: UnitId) => planets.reduce((sum, p) => sum + landedOn(p.id, unit), 0);
  /** The kinds of structures to place: those in the space area, and those already assigned to a planet. */
  const kinds = structures ? STRUCTURES.filter(kind => (structures.arrived[kind] ?? 0) > 0 || planets.some(p => structures.landedOn(p.id, kind) > 0)) : [];
  const placedInAll = (kind: StructureKind) => planets.reduce((sum, p) => sum + (structures?.landedOn(p.id, kind) ?? 0), 0);
  const stock = Object.fromEntries([
    ...units.map(unit => [unit, (arrived[unit] ?? 0) - landedInAll(unit)]),
    ...kinds.map(kind => [kind, (structures?.arrived[kind] ?? 0) - placedInAll(kind)]),
  ]);

  const rows: UnitDraftRow[] = planets.map(planet => {
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
    return {
      id: planet.id,
      label: t('plan.tactical.landingOn', { planet: planet.name }),
      place: <PlanetBadge planet={planet} control={control} exhausted={exhausted} facts={facts} compact />,
      items: [
        ...units.map(unit => ({
          kind: unit, picked: landedOn(planet.id, unit),
          takeLabel: t('plan.tactical.landOne', { unit: unitName(unit) }), returnLabel: t('stage.giveBack', { unit: unitName(unit) }),
        })),
        ...kinds.map(kind => ({
          kind, picked: structures?.landedOn(planet.id, kind) ?? 0,
          takeLabel: t('plan.tactical.landOne', { unit: t(`unit.${kind}`) }), returnLabel: t('stage.giveBack', { unit: t(`unit.${kind}`) }),
        })),
      ],
      aside: (standing.length > 0 || enemies.length > 0) && (
        <div className="landing-stacks">
          {standing.map(unit => <UnitTile key={unit} variant="stack" kind={unit} colour={colour} count={left(unit)} label={`${unitName(unit)} ×${left(unit)}`} />)}
          {enemies.map(({ owner, unit, count }) => <UnitTile key={`${owner}:${unit}`} variant="stack" kind={unit} colour={colours[owner]} count={count} label={`${unitName(unit)} ×${count}`} />)}
        </div>
      ),
    };
  });

  return (
    <div className="landing">
      <UnitDraft
        rows={rows} stock={stock} colour={colour} stockLabel={t('plan.tactical.landingStock')} pickedLabel={t('plan.tactical.landed')}
        onTake={(planetId, kind) => (isStructure(kind)
          ? structures?.onLand(planetId, kind, structures.landedOn(planetId, kind) + 1)
          : onLand(planetId, kind as UnitId, landedOn(planetId, kind as UnitId) + 1))}
        onReturn={(planetId, kind) => (isStructure(kind)
          ? structures?.onLand(planetId, kind, structures.landedOn(planetId, kind) - 1)
          : onLand(planetId, kind as UnitId, landedOn(planetId, kind as UnitId) - 1))}
      />
    </div>
  );
}
