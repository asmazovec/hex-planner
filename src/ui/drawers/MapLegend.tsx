import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RowIcon } from '../primitives/Icon';
import { UnitToken } from '../units/UnitToken';
import type { TokenKind } from '../../domain/hexLayout';
import type { DataPack } from '../../domain/types';
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

// TODO(P2-243) #ws:ui-containers #type:dup #needs:prototype #size:s #legend #planet — Своя планета легенды вместо PlanetMark из TileView: легенда расходится с картой; рисовать PlanetMark
function Planet({ exhausted, control = 'me' }: { exhausted?: boolean; control?: 'me' | 'enemy' }) {
  return (
    <svg viewBox="-16 -16 32 32" className="legend-svg" aria-hidden="true">
      <g className={exhausted ? 'planet-exhausted' : undefined}>
        <circle r={13} className={`planet-disc planet-${control}`} />
        <text y={4} className="planet-values legend-values">
          <tspan className="value-resources">2</tspan><tspan>/</tspan><tspan className="value-influence">3</tspan>
        </text>
        {exhausted && <line x1={-9} y1={9} x2={9} y2={-9} className="planet-strike" />}
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
      <Row mark={<Planet />} text={k('values')} />
      <Row mark={<Planet control="enemy" />} text={k('control')} />
      <Row mark={<Planet exhausted />} text={k('exhausted')} />
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
      <Row mark={<span className="icon-button"><RowIcon name="edit" /></span>} text={k('rowEdit')} />
      <Row mark={<span className="icon-button"><RowIcon name="done" /></span>} text={k('rowDone')} />
      <Row mark={<span className="icon-button"><RowIcon name="remove" /></span>} text={k('rowRemove')} />
    </DrawerSheet>
  );
}
