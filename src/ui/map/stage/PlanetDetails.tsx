import { useTranslation } from 'react-i18next';
import { legendarySummary } from '../../../data/legendarySummaries';
import type { PlanetDef } from '../../../domain/types';

export interface PlanetDetailsProps {
  planet: PlanetDef;
  /** The planet stands on a Fracture tile, and the rulebook gives each of those a relic icon. */
  relic: boolean;
  exhausted: boolean;
}

/** All printed parameters of one planet, plus whether it is ready; control and docks are edited beside it. */
export function PlanetDetails({ planet, relic, exhausted }: PlanetDetailsProps) {
  const { t, i18n } = useTranslation();
  const summary = planet.legendary ? legendarySummary(planet.legendary, i18n.language === 'en' ? 'en' : 'ru') : null;
  return (
    <div className="planet-details">
      <span className="muted">
        <span className="value-resources">{planet.resources}</span>/<span className="value-influence">{planet.influence}</span>
        {' · '}
        {exhausted ? t('map.sheet.exhausted') : t('map.sheet.ready')}
      </span>
      {planet.traits && (
        <span className="muted" aria-label={t('map.sheet.traits')}>
          {planet.traits.map(trait => (
            <span key={trait} className="trait">
              <span className={`trait-swatch trait-${trait}`} aria-hidden="true" />
              {t(`map.trait.${trait}`)}{' '}
            </span>
          ))}
        </span>
      )}
      {(planet.tech || planet.skip) && (
        <span className="muted" aria-label={t('map.sheet.specialties')}>
          {[...(planet.tech ?? []).map(tech => t(`map.tech.${tech}`)), ...(planet.skip ? [t(`map.skip.${planet.skip}`)] : [])].join(', ')}
        </span>
      )}
      {relic && <span className="muted">{t('map.sheet.relic')}</span>}
      {planet.legendary && (
        <span className="planet-legend">
          <strong>{planet.legendary}</strong>
          {summary && <span className="muted">{summary}</span>}
        </span>
      )}
    </div>
  );
}
