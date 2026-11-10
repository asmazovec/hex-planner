import { useTranslation } from 'react-i18next';
import { textOf } from '../../../domain/components';
import type { DataPack, PlanetDef } from '../../../domain/types';
import { LEGENDARY_SHAPE, TECH_SHAPES } from '../marks';

export interface PlanetDetailsProps {
  planet: PlanetDef;
  /** Gives the printed text of a legendary ability. */
  pack: DataPack;
  /** The planet stands on a Fracture tile, and the rulebook gives each of those a relic icon. */
  relic: boolean;
  exhausted: boolean;
}

/** A mark in the box of the technology shapes, named for the screen reader and under the finger. */
function Mark({ d, className, label }: { d: string; className: string; label: string }) {
  return (
    <svg viewBox="-5 -5 10 10" className="planet-mark" role="img" aria-label={label}>
      <title>{label}</title>
      <path d={d} className={className} />
    </svg>
  );
}

/**
 * All printed parameters of one planet: one line with its name, resources/influence and the marks the map draws
 * (traits, technology specialties, legendary), then what its card says in words. Control is chosen beside it.
 */
export function PlanetDetails({ planet, pack, relic, exhausted }: PlanetDetailsProps) {
  const { t } = useTranslation();
  const summary = planet.legendary ? textOf(pack, `legendary:${planet.id}`) : '';
  return (
    <div className="planet-details">
      <div className="planet-head">
        <strong>{planet.name}</strong>
        <span className="planet-values">
          <span className="value-resources">{planet.resources}</span>/<span className="value-influence">{planet.influence}</span>
        </span>
        <span className="planet-marks">
          {(planet.traits ?? []).map(trait => (
            <span key={trait} className={`trait-swatch trait-${trait}`} role="img" aria-label={t(`map.trait.${trait}`)} title={t(`map.trait.${trait}`)} />
          ))}
          {(planet.tech ?? []).map(tech => <Mark key={tech} d={TECH_SHAPES[tech]} className={`planet-tech planet-tech-${tech}`} label={t(`map.tech.${tech}`)} />)}
          {planet.legendary && <Mark d={LEGENDARY_SHAPE} className="planet-legendary" label={t('map.sheet.legendaryMark')} />}
        </span>
        <span className="muted planet-state">{exhausted ? t('map.sheet.exhausted') : t('map.sheet.ready')}</span>
      </div>
      {planet.skip && <span className="muted">{t(`map.skip.${planet.skip}`)}</span>}
      {/* What a planet's card says beyond its numbers, in the look of a strategy card's ability: the legend in gold. */}
      {planet.legendary && (
        <span className="card-ability card-ability-primary planet-legend">
          <b>{planet.legendary}</b>
          {summary && <span>{summary}</span>}
        </span>
      )}
      {relic && <span className="card-ability card-ability-secondary planet-legend"><b>{t('map.sheet.relic')}</b></span>}
    </div>
  );
}
