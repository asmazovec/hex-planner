import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RowIcon } from '../primitives/Icon';
import { UnitToken } from '../units/UnitToken';
import type { TokenKind } from '../../domain/hexLayout';
import type { DataPack, PlanetDef } from '../../domain/types';
import { PlanetMark } from '../map/TileView';
import { UNIT_ORDER } from '../units/unitOrder';
import { BADGE_CUT, CommandTokenMark, IngressMark, PickupTag, RouteBadge } from '../map/marks';
import { DrawerSheet } from '../overlays/Drawer';
import { SectionTitle } from '../primitives/SectionTitle';
import { playerStyle } from '../primitives/player';

const HEX = BADGE_CUT;

function Hex({ fill, state }: { fill: string; state?: string }) {
  return (
    <svg viewBox="-18 -16 36 32" className="legend-svg" aria-hidden="true">
      <g className={`tile${state ? ` tile-${state}` : ''}`}><polygon points={HEX} className={`hex hex-${fill}`} /></g>
    </svg>
  );
}

function Route({ tone = 'planned', gap }: { tone?: string; gap?: boolean }) {
  return (
    <svg viewBox="0 0 48 16" className="legend-svg legend-route" aria-hidden="true">
      <g className={`route route-${tone}`}><path d="M3,8H45" className={`route-line${gap ? ' route-gap' : ''}`} /></g>
    </svg>
  );
}

/** A real planet as the map draws it; the numbers take their size from the tile they stand on. */
function Planet({ planet, exhausted = false, control = 'me' }: { planet: PlanetDef; exhausted?: boolean; control?: 'me' | 'enemy' }) {
  return (
    <svg viewBox="-14 -14 28 28" className="legend-svg" aria-hidden="true">
      <g className="tile">
        <g className={`planet${exhausted ? ' planet-exhausted' : ''}`}>
          <PlanetMark planet={planet} control={control} exhausted={exhausted} />
        </g>
      </g>
    </svg>
  );
}

/** Each colour has its modifier in the theme: `legend-dot-tech-biotic` and so on. */
const Dots = ({ colours }: { colours: string[] }) => (
  <>{colours.map(colour => <i key={colour} className={`legend-dot legend-dot-${colour}`} />)}</>
);

function Row({ mark, text }: { mark: ReactNode; text: ReactNode }) {
  return <div className="legend-row"><span className="legend-mark">{mark}</span><span>{text}</span></div>;
}

/** What the marks of the interface mean, section by section. */
export function MapLegend({ colour, pack }: { colour: string; pack: DataPack }) {
  const { t } = useTranslation();
  const k = (key: string) => t(`map.legend.${key}`);
  const title = (key: string) => <SectionTitle>{k(key)}</SectionTitle>;
  // Planets of the base game: one with a trait and a technology, one with a trait only.
  const { wellon, lodor } = pack.planets as Partial<Record<string, PlanetDef>>;
  return (
    <DrawerSheet className="legend-panel" title={k('title')}>

      {title('systems')}
      <Row mark={<Hex fill="home" />} text={k('home')} />
      <Row mark={<Hex fill="mecatol" />} text={k('mecatol')} />
      <Row mark={<Hex fill="system" />} text={k('system')} />
      <Row mark={<Hex fill="anomaly" />} text={k('anomaly')} />
      <Row mark={<Hex fill="wormhole" />} text={k('wormhole')} />
      <Row mark={<Hex fill="hyperlane" />} text={k('hyperlane')} />
      <Row mark={<Hex fill="free" />} text={k('free')} />

      {title('states')}
      <Row mark={<Hex fill="system" state="active" />} text={k('active')} />
      <Row mark={<Hex fill="system" state="source" />} text={k('source')} />
      <Row mark={<Hex fill="system" state="path" />} text={k('path')} />
      <Row mark={<Hex fill="system" state="valid" />} text={k('valid')} />

      {title('planets')}
      {wellon && <Row mark={<Planet planet={wellon} />} text={k('values')} />}
      {lodor && <Row mark={<Planet planet={lodor} control="enemy" />} text={k('control')} />}
      {wellon && <Row mark={<Planet planet={wellon} exhausted />} text={k('exhausted')} />}
      <Row mark={<Dots colours={['tech-propulsion', 'tech-biotic', 'tech-cybernetic', 'tech-warfare']} />} text={k('tech')} />
      <Row mark={<Dots colours={['trait-cultural', 'trait-hazardous', 'trait-industrial']} />} text={k('trait')} />
      <Row mark={<Dots colours={['gold']} />} text={k('legendary')} />

      {title('units')}
      {[...UNIT_ORDER.filter(unit => pack.units[unit]), 'pds', 'spacedock'].map(raw => {
        const kind = raw as TokenKind;
        const name = kind === 'pds' ? t('map.pds') : kind === 'spacedock' ? t('map.spaceDock') : t(`unit.${kind}`);
        return (
          <Row
            key={kind}
            mark={<svg viewBox="-75 -75 150 150" className="legend-svg" aria-hidden="true"><UnitToken kind={kind} colour={colour} size={100} /></svg>}
            text={<><b>{name}</b>{k(`unit.${kind}`)}</>}
          />
        );
      })}

      {title('marks')}
      <Row mark={<Hex fill="system" state="activated" />} text={k('activated')} />
      <Row mark={<svg viewBox="-9 -9 18 18" className="legend-svg" aria-hidden="true"><CommandTokenMark /></svg>} text={k('command')} />
      <Row mark={<svg viewBox="-9 -9 18 18" className="legend-svg" aria-hidden="true"><IngressMark /></svg>} text={k('ingress')} />
      {/* TODO(P2-240) #ws:ui-containers #type:dup #dep:P2-224 #size:s #player-colour #inline-style #legend — Значок места свёрстан заново с жёстким var(--player-2) во style: тот же значок, что на тайле — P2 note: the colour now comes through playerStyle; the tile's own SVG seat mark is smaller and drawn in the tile's scale, so putting it here changes how the legend looks: needs prototype */}
      <Row mark={<i className="legend-seat" style={playerStyle('background', 2)}>2</i>} text={k('seat')} />

      {title('routes')}
      <Row mark={<Route tone="active" />} text={k('routeActive')} />
      <Row mark={<Route />} text={k('routePlanned')} />
      <Row mark={<Route tone="done" />} text={k('routeDone')} />
      <Row mark={<Route gap />} text={k('routeGap')} />
      <Row
        mark={<svg viewBox="-13 -12 26 24" className="legend-svg" aria-hidden="true"><g className="route route-badge route-planned"><RouteBadge number={1} /></g></svg>}
        text={k('routeNumber')}
      />
      <Row
        mark={<svg viewBox="-16 -11 32 22" className="legend-svg" aria-hidden="true"><g className="route route-tag route-planned"><PickupTag count={2} /></g></svg>}
        text={k('routePickup')}
      />

      {title('plan')}
      <Row mark={<b className="legend-number">3 → 2</b>} text={k('totals')} />
      <Row mark={<b className="legend-word">{t('plan.forecast')}</b>} text={k('forecast')} />
      <Row mark={<b className="legend-word">{t('plan.now')}</b>} text={k('now')} />
      <Row mark={<span className="legend-grip"><RowIcon name="grip" /></span>} text={k('rowGrip')} />
      <Row mark={<span className="hex-button"><RowIcon name="edit" /></span>} text={k('rowEdit')} />
      <Row mark={<span className="hex-button"><RowIcon name="done" /></span>} text={k('rowDone')} />
      <Row mark={<span className="hex-button"><RowIcon name="remove" /></span>} text={k('rowRemove')} />
    </DrawerSheet>
  );
}
