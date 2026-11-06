import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TokenKind } from '../../domain/hexLayout';
import { UnitToken } from './UnitToken';

const ROWS: { kinds: TokenKind[]; text: string }[] = [
  { kinds: ['carrier'], text: 'map.legend.ship' },
  { kinds: ['fighter'], text: 'map.legend.fighter' },
  { kinds: ['infantry', 'mech'], text: 'map.legend.ground' },
  { kinds: ['pds', 'spacedock'], text: 'map.legend.structure' },
];

/** A help button over the map, opening a short explanation of the token shapes. */
export function UnitLegend({ colour }: { colour: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event: Event) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="map-legend" ref={box}>
      <button ref={button} type="button" className="map-legend-button" aria-expanded={open} aria-label={t('map.legend.open')} onClick={() => setOpen(!open)}>?</button>
      {open && (
        <div className="map-legend-box" role="dialog" aria-label={t('map.legend.title')}>
          {ROWS.map(({ kinds, text }) => (
            <div key={text} className="map-legend-row">
              <span className="map-legend-tokens">
                {kinds.map(kind => (
                  <svg key={kind} viewBox="-75 -75 150 150" aria-hidden="true"><UnitToken kind={kind} colour={colour} size={100} /></svg>
                ))}
              </span>
              <span>{t(text)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
