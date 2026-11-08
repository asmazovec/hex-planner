import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { DataPack, Game, Warning } from '../../domain/types';
import { systemName } from '../map/systemName';

export interface WarningTextProps {
  warning: Warning;
  game: Game;
  pack: DataPack;
}

/** The text of one warning code; slot keys and ids in its params become the names the player knows. */
export function WarningText({ warning, game, pack }: WarningTextProps) {
  const { t } = useTranslation();
  const { code, params } = warning;
  const place = (id: string | number): string => pack.planets[id]?.name ?? systemName(game, pack, String(id));
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
    pool: params.pool === undefined ? undefined : t(`plan.summary.${params.pool}`),
    slice: params.sliceId === undefined ? undefined : t(`plan.slice.${params.sliceId}`),
  });
  return <span className="warning-text">{text}</span>;
}

export type WarningListProps = {
  /** `block` stands in a block of an editor with the orange edge; `row` sits in a row that marks itself. */
  variant?: 'block' | 'row';
} & ({ warnings: Warning[]; game: Game; pack: DataPack } | { message: ReactNode });

/** The warnings of one block, inside that block and marked the same way everywhere; `message` is a free text in the same look. */
export function WarningList(props: WarningListProps) {
  const { t } = useTranslation();
  const edge = props.variant === 'row' ? '' : ' place-warnings';
  if ('message' in props) return <p className={`warning-text${edge}`} role="status">{props.message}</p>;
  const { warnings, game, pack } = props;
  if (warnings.length === 0) return null;
  return (
    <ul className={`warning-list${edge}`} aria-label={props.variant === 'row' ? undefined : t('plan.tactical.warnings')}>
      {warnings.map((warning, i) => <li key={i}><WarningText warning={warning} game={game} pack={pack} /></li>)}
    </ul>
  );
}
