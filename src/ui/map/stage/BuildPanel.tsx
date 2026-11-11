import { useTranslation } from 'react-i18next';
import type { TokenKind } from '../../../domain/hexLayout';
import type { DataPack, Game, GameState, Warning } from '../../../domain/types';
import { SectionTitle } from '../../primitives/SectionTitle';
import { WarningList } from '../../feedback/WarningText';
import { PlanetBadge, SpaceBadge } from '../PlanetBadge';
import { layoutFor, UnitDraft } from '../../units/UnitDraft';
import type { MeterRow, ShopRow } from './useStage';

export interface BuildPanelProps {
  game: Game;
  pack: DataPack;
  /** What the hex shows: a planet's badge follows its control and readiness. */
  state: GameState;
  /** The rows of units produced and of structures built, by where they go. */
  production: ShopRow[];
  construction: ShopRow[];
  /** The figures left in the reinforcements, for all the rows together. */
  stock: Partial<Record<TokenKind, number>>;
  colour: string;
  onTake: (rowId: string, kind: TokenKind) => void;
  onReturn: (rowId: string, kind: TokenKind) => void;
  structuresOnly: boolean;
  boughtTotal: number;
  spent: number;
  /** My own purchases count along against what I can pay and hold; an opponent's do not. */
  mine: boolean;
  meters: MeterRow[];
  warnings: Warning[];
  /** What the board itself breaks on this system's planets, for any player. */
  boardWarnings: Warning[];
}

/**
 * Create: a row per place a purchase goes to, the space area and each planet; a button buys one while the reinforcements
 * hold a figure and, in the look of "beyond the stock", after that too (the domain warns); a tap on a bought one, or on its ringed token, takes it back. Units are produced and structures
 * built, so each stands under its own heading; a hex opened for one of them shows only it.
 */
export function BuildPanel({ game, pack, state, production, construction, stock, colour, onTake, onReturn, structuresOnly, boughtTotal, spent, mine, meters, warnings, boardWarnings }: BuildPanelProps) {
  const { t } = useTranslation();
  const draft = (rows: ShopRow[]) => (
    <UnitDraft
      stock={stock} colour={colour} onTake={onTake} onReturn={onReturn} stockLabel={t('stage.stock')} pickedLabel={t('stage.boughtZone')}
      rows={rows.map(({ id, planet, items }) => ({
        id, items, layout: layoutFor(items.length), label: planet ? planet.name : t('draft.space'),
        place: planet
          ? <PlanetBadge planet={planet} control={state.control[planet.id]} exhausted={state.exhausted.includes(planet.id)} compact />
          : <SpaceBadge label={t('draft.space')} />,
      }))}
    />
  );
  return (
    <>
      {production.length > 0 && <><SectionTitle>{t('stage.production')}</SectionTitle>{draft(production)}</>}
      {construction.length > 0 && <><SectionTitle>{t('stage.construction')}</SectionTitle>{draft(construction)}</>}
      <WarningList warnings={boardWarnings} game={game} pack={pack} />
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
    </>
  );
}
