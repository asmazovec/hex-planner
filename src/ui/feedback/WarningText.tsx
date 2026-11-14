import { memo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { componentById } from '../../domain/components';
import { isWaived } from '../../domain/rules/registry';
import type { DataPack, Warning } from '../../domain/types';
import { mapSource } from '../../game/space';
import type { Board, Table } from '../../game/types';
import { noteMark } from '../components/noteMark';
import { systemTitle } from '../map/systemName';

export interface WarningTextProps {
  warning: Warning;
  table: Table;
  /** The board the warning is about: its Fracture names the systems. */
  board: Board;
  pack: DataPack;
}

/**
 * The same warning over the same map: every replay makes new warning objects, and a long plan shows hundreds of them,
 * so the text is made again only when the code, its params, the map or the pack change. A new language redraws it anyway.
 */
const sameWarning = (a: WarningTextProps, b: WarningTextProps): boolean =>
  a.warning.code === b.warning.code && mapSource(a.table, a.board) === mapSource(b.table, b.board) && a.table.players === b.table.players && a.pack === b.pack
  && JSON.stringify(a.warning.params) === JSON.stringify(b.warning.params);

/** The text of one warning code; slot keys and ids in its params become the names the player knows. */
export const WarningText = memo(function WarningText({ warning, table, board, pack }: WarningTextProps) {
  const { t } = useTranslation();
  const { code, params } = warning;
  const place = (id: string | number): string => pack.planets[id]?.name ?? systemTitle(mapSource(table, board), pack, String(id), t);
  const needed = Number(params.needed ?? 0);
  const paid = Number(params.paid ?? 0);
  const text = t(`plan.warning.${code}`, {
    ...params,
    short: needed - paid,
    planet: params.planetId === undefined ? undefined : place(params.planetId),
    from: params.from === undefined ? undefined : place(params.from),
    system: params.systemId === undefined ? undefined : place(params.systemId),
    where: params.where === undefined ? undefined : place(params.where),
    unit: params.unit === undefined ? undefined : t(`unit.${params.unit}`),
    objective: params.objective === undefined ? undefined : componentById(pack, String(params.objective))?.name ?? String(params.objective),
    pool: params.pool === undefined ? undefined : t(`plan.summary.${params.pool}`),
    symbols: params.symbols === undefined ? undefined : String(params.symbols).replace(/(propulsion|biotic|cybernetic|warfare) ×/g, (_, colour: string) => `${t(`map.tech.${colour}`)} ×`),
    slice: params.sliceId === undefined ? undefined : t(`plan.slice.${params.sliceId}`),
  });
  return <span className="warning-text">{text}</span>;
}, sameWarning);

/** The names of the components that lift a warning; a promissory note says whose card it is. */
export function waiverNames(warning: Warning, table: Table, pack: DataPack, t: ReturnType<typeof useTranslation>['t']): string {
  return (warning.waivedBy ?? []).map(id => {
    const name = componentById(pack, id)?.name ?? id;
    const owner = noteMark(table, pack, id, t).owner?.name;
    return owner ? `${name} (${owner})` : name;
  }).join(', ');
}

export type WarningListProps = {
  /** `block` stands in a block of an editor with the orange edge; `row` sits in a row that marks itself. */
  variant?: 'block' | 'row';
} & ({ warnings: Warning[]; table: Table; board: Board; pack: DataPack } | { message: ReactNode });

/**
 * The warnings of one block, inside that block and marked the same way everywhere; `message` is a free text in the same
 * look. A warning a component lifted is still listed, after those that stand, in the look of a thing switched off:
 * dimmed and struck through, with the component that allows it named under it. A list of waived warnings alone has no
 * orange edge.
 */
export function WarningList(props: WarningListProps) {
  const { t } = useTranslation();
  if ('message' in props) return <p className={`warning-text${props.variant === 'row' ? '' : ' place-warnings'}`} role="status">{props.message}</p>;
  const { warnings, table, board, pack } = props;
  if (warnings.length === 0) return null;
  const standing = warnings.filter(w => !isWaived(w));
  const waived = warnings.filter(isWaived);
  const edge = props.variant === 'row' ? '' : standing.length > 0 ? ' place-warnings' : ' place-warnings place-waived';
  return (
    <ul className={`warning-list${edge}`} aria-label={props.variant === 'row' ? undefined : t('plan.tactical.warnings')}>
      {standing.map((warning, i) => <li key={i} data-code={warning.code}><WarningText warning={warning} table={table} board={board} pack={pack} /></li>)}
      {waived.map((warning, i) => (
        <li key={`waived-${i}`} className="warning-waived" data-code={warning.code}>
          <WarningText warning={warning} table={table} board={board} pack={pack} />
          <small className="warning-allowed">{t('plan.warningWaived', { list: waiverNames(warning, table, pack, t) })}</small>
        </li>
      ))}
    </ul>
  );
}
