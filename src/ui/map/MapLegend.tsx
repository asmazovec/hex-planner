import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RowIcon } from '../plan/RowIcon';
import { UnitToken } from '../units/UnitToken';
import type { TokenKind } from '../../domain/hexLayout';
import type { DataPack } from '../../domain/types';
import { UNIT_ORDER } from '../units/unitOrder';

const HEX = '15,0 7.5,13 -7.5,13 -15,0 -7.5,-13 7.5,-13';
const BADGE = '10.5,0 5.25,9.1 -5.25,9.1 -10.5,0 -5.25,-9.1 5.25,-9.1';

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

const Dots = ({ colours }: { colours: string[] }) => (
  <>{colours.map(colour => <i key={colour} className="legend-dot" style={{ background: `var(--${colour})` }} />)}</>
);

function Row({ mark, text }: { mark: ReactNode; text: ReactNode }) {
  return <div className="legend-row"><span className="legend-mark">{mark}</span><span>{text}</span></div>;
}

/** What the marks of the interface mean, section by section. */
export function MapLegend({ colour, pack }: { colour: string; pack: DataPack }) {
  const { t } = useTranslation();
  const k = (key: string) => t(`map.legend.${key}`);
  const title = (key: string) => <h3>{k(key)}</h3>;
  return (
    <aside className="legend-panel" role="dialog" aria-label={k('title')}>
      <h2>{k('title')}</h2>

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
      <Row mark={<svg viewBox="-9 -9 18 18" className="legend-svg" aria-hidden="true"><circle r={7} className="token" /><path d="M-3,2 L0,-4 L3,2 Z" className="token-mark" /></svg>} text={k('command')} />
      <Row mark={<svg viewBox="-9 -9 18 18" className="legend-svg" aria-hidden="true"><path d="M0,-8 L8,0 L0,8 L-8,0 Z" className="ingress" /></svg>} text={k('ingress')} />
      <Row mark={<i className="legend-seat" style={{ background: 'var(--player-2)' }}>2</i>} text={k('seat')} />

      {title('routes')}
      <Row mark={<Route tone="active" />} text={k('routeActive')} />
      <Row mark={<Route />} text={k('routePlanned')} />
      <Row mark={<Route tone="done" />} text={k('routeDone')} />
      <Row mark={<Route gap />} text={k('routeGap')} />
      <Row
        mark={<svg viewBox="-13 -12 26 24" className="legend-svg" aria-hidden="true"><g className="route route-badge route-planned"><polygon points={BADGE} className="route-badge-hex" /><text y={4} className="route-badge-number">1</text></g></svg>}
        text={k('routeNumber')}
      />
      <Row
        mark={<svg viewBox="-16 -11 32 22" className="legend-svg" aria-hidden="true"><g className="route route-tag route-planned"><rect x={-14} y={-9} width={28} height={18} rx={9} /><text y={4}>+2</text></g></svg>}
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
    </aside>
  );
}
