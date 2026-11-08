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

export interface WarningListProps {
  warnings: Warning[];
  game: Game;
  pack: DataPack;
}

// TODO(P2-380) #ws:ui-warnings #type:ui #warning-channel — нет варианта «в строке» и произвольного текста, поэтому EntryList, HexStage, ShareConflict собирают своё; добавить variant и message
/** The warnings of one block, inside that block and marked the same way everywhere. */
export function WarningList({ warnings, game, pack }: WarningListProps) {
  const { t } = useTranslation();
  if (warnings.length === 0) return null;
  return (
    <ul className="warning-list place-warnings" aria-label={t('plan.tactical.warnings')}>
      {warnings.map((warning, i) => <li key={i}><WarningText warning={warning} game={game} pack={pack} /></li>)}
    </ul>
  );
}
