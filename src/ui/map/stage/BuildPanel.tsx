import { useTranslation } from 'react-i18next';
import type { TokenKind } from '../../../domain/hexLayout';
import type { DataPack, Game, Warning } from '../../../domain/types';
import { SectionTitle } from '../../primitives/SectionTitle';
import { WarningList } from '../../feedback/WarningText';
import { UnitShop, type ShopItem } from './UnitShop';
import type { MeterRow } from './useStage';

export interface BuildPanelProps {
  game: Game;
  pack: DataPack;
  items: ShopItem[];
  onPick: (kind: TokenKind) => void;
  structuresOnly: boolean;
  manyPlanets: boolean;
  boughtTotal: number;
  spent: number;
  /** My own purchases count along against what I can pay and hold; an opponent's do not. */
  mine: boolean;
  meters: MeterRow[];
  warnings: Warning[];
}

/** Build: a picture buys one, a ringed token takes a purchase back. */
export function BuildPanel({ game, pack, items, onPick, structuresOnly, manyPlanets, boughtTotal, spent, mine, meters, warnings }: BuildPanelProps) {
  const { t } = useTranslation();
  return (
    <>
      <SectionTitle>{t(structuresOnly ? 'stage.structures' : 'stage.shop')}</SectionTitle>
      <UnitShop items={items} onPick={onPick} />
      <div className="stage-total">
        <span>{t('stage.bought', { n: boughtTotal })}</span>
        <b>{spent}</b>
      </div>
      {mine && !structuresOnly && (
        <div className="stage-meters" role="group" aria-label={t('stage.meters')}>
          {meters.map(({ key, now, of, over }) => (
            <div key={key} className={over ? 'stage-meter stage-meter-over' : 'stage-meter'}>
              <span>{t(`stage.meter.${key}`)}</span>
              <b>{now} / {of}</b>
            </div>
          ))}
        </div>
      )}
      {mine && <WarningList warnings={warnings} game={game} pack={pack} />}
      <p className="muted">{t('stage.buildNote')}</p>
      {manyPlanets && <p className="muted">{t('stage.planetNote')}</p>}
    </>
  );
}
