import { useTranslation } from 'react-i18next';
import type { DataPack, Warning } from '../../../domain/types';
import type { Board, Table } from '../../../game/types';
import { WarningList } from '../../feedback/WarningText';
import type { TokenKind } from '../../../domain/hexLayout';
import { SectionTitle } from '../../primitives/SectionTitle';
import { UnitShop, type ShopItem } from './UnitShop';

export interface SetupPanelProps {
  items: ShopItem[];
  onPick: (kind: TokenKind) => void;
  /** Only structures are offered. */
  structuresOnly: boolean;
  manyPlanets: boolean;
  table: Table;
  board: Board;
  pack: DataPack;
  /** What the board itself breaks on this system's planets, for any player. */
  boardWarnings: Warning[];
}

/** Setup: a picture places one on the hex, a token takes one off. */
export function SetupPanel({ items, onPick, structuresOnly, manyPlanets, table, board, pack, boardWarnings }: SetupPanelProps) {
  const { t } = useTranslation();
  return (
    <>
      <SectionTitle>{t(structuresOnly ? 'stage.construction' : 'stage.place')}</SectionTitle>
      <UnitShop items={items} onPick={onPick} />
      <WarningList warnings={boardWarnings} table={table} board={board} pack={pack} />
      <p className="muted">{t('stage.setupNote')}</p>
      {manyPlanets && <p className="muted">{t('stage.planetNote')}</p>}
    </>
  );
}
