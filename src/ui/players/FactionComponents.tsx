import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { sheetSummary } from '../../data/sheetSummaries';
import { techSummary } from '../../data/techSummaries';
import { factionSheet } from '../../domain/factionSheet';
import type { ComponentPack, DataPack, ExpansionId, FactionDef, SheetItem, SheetMech, TechDef, TechType } from '../../domain/types';
import { currentLanguage } from '../../i18n';
import { EXPANSION_NAMES } from '../common/expansions';
import { TechMark } from '../map/marks';
import { SectionTitle } from '../primitives/SectionTitle';

const PACK_NAMES: Record<ComponentPack, string> = { base: 'Base', ...EXPANSION_NAMES };

const TECH_ORDER: TechType[] = ['propulsion', 'biotic', 'cybernetic', 'warfare'];
/** Unit upgrades whose numbers the ship table shows; the structures' are not there. */
const IN_SHIP_TABLE = ['flagship', 'warsun', 'dreadnought', 'carrier', 'cruiser', 'destroyer', 'fighter', 'infantry'];

interface ComponentProps {
  item: SheetItem;
  kicker?: string;
  extra?: string;
  /** Marks before the name and after it: a technology's type and its prerequisites. */
  mark?: ReactNode;
  after?: ReactNode;
  /** A retelling from another store than `sheetSummaries`. */
  text?: string | null;
}

function Component({ item, kicker, extra, mark, after, text }: ComponentProps) {
  const { t } = useTranslation();
  const summary = text === undefined ? sheetSummary(item.id, currentLanguage()) : text ? { text } : null;
  return (
    <div className="sheet-item" data-testid="sheet-item">
      <div className="sheet-head">
        {mark}
        <b>{item.name}</b>
        {after}
        {kicker && <span className="sheet-kicker">{kicker}</span>}
        <span className={`sheet-pack sheet-pack-${item.pack}`} title={t('players.fromPack', { pack: PACK_NAMES[item.pack] })}>{PACK_NAMES[item.pack]}</span>
      </div>
      {extra && <span className="sheet-stats">{extra}</span>}
      {summary?.text && <p>{summary.text}</p>}
      {summary?.unlock && <p className="sheet-unlock">{t('players.unlock', { text: summary.unlock })}</p>}
    </div>
  );
}

/** Prerequisites as small marks of their colours, one per prerequisite; the label spells them out. */
function Prerequisites({ tech }: { tech: TechDef }) {
  const { t } = useTranslation();
  const marks = TECH_ORDER.flatMap(type => Array.from({ length: tech.requires?.[type] ?? 0 }, () => type));
  if (marks.length === 0) return null;
  const label = t('players.requires', { list: marks.map(type => t(`map.tech.${type}`)).join(', ') });
  return (
    <span className="sheet-requires" role="img" aria-label={label} title={label}>
      {marks.map((type, n) => <TechMark key={n} type={type} size={9} />)}
    </span>
  );
}

function FactionTech({ item, tech }: { item: SheetItem; tech: TechDef }) {
  const { t } = useTranslation();
  const upgrade = tech.upgrade;
  const unitName = upgrade === 'spacedock' ? t('map.spaceDock') : upgrade === 'pds' ? t('map.pds') : upgrade ? t(`unit.${upgrade}`) : '';
  const extra = upgrade
    ? [t('players.unitUpgrade', { unit: unitName }), IN_SHIP_TABLE.includes(upgrade) ? t('players.upgradeInTable') : null].filter(Boolean).join('. ')
    : undefined;
  return (
    <Component
      item={item}
      mark={tech.type ? <span className="sheet-tech-type" role="img" aria-label={t(`map.tech.${tech.type}`)} title={t(`map.tech.${tech.type}`)}><TechMark type={tech.type} /></span> : undefined}
      after={<Prerequisites tech={tech} />}
      extra={extra}
      text={techSummary(item.id, currentLanguage())}
    />
  );
}

/**
 * A faction's abilities, faction technologies, leaders, mech and breakthrough: only what the chosen expansions bring, each
 * signed with where it comes from. `technologies` gives the type and prerequisites of each faction technology.
 */
export function FactionComponents({ faction, expansions, technologies }: { faction: FactionDef; expansions: ExpansionId[]; technologies: DataPack['technologies'] }) {
  const { t } = useTranslation();
  const { abilities, leaders, mechs, techs, breakthrough } = factionSheet(faction, expansions);
  const mechStats = (mech: SheetMech): string => [
    mech.cost !== null ? `${t('ships.cost')} ${mech.cost}` : null,
    mech.combat !== null ? `${t('ships.combat')} ${mech.dice > 1 ? `${mech.combat}×${mech.dice}` : mech.combat}` : null,
    mech.sustain ? t('ships.sustain') : null,
  ].filter(Boolean).join(' · ');
  return (
    <div className="player-sheet">
      <div>
        <SectionTitle as="div" className="player-sec">{t('players.abilities')}</SectionTitle>
        {abilities.map(item => <Component key={item.id} item={item} />)}
      </div>
      {techs.length > 0 && (
        <div>
          <SectionTitle as="div" className="player-sec">{t('players.factionTechs')}</SectionTitle>
          {techs.map(item => technologies[item.id] && <FactionTech key={item.id} item={item} tech={technologies[item.id]} />)}
        </div>
      )}
      {leaders.length > 0 && (
        <div>
          <SectionTitle as="div" className="player-sec">{t('players.leaders')}</SectionTitle>
          {leaders.map(item => <Component key={item.id} item={item} kicker={t(`players.leader.${item.type}`)} />)}
        </div>
      )}
      {(mechs.length > 0 || breakthrough) && (
        <div>
          {mechs.length > 0 && <SectionTitle as="div" className="player-sec">{t('players.mech')}</SectionTitle>}
          {mechs.map(item => <Component key={item.id} item={item} extra={mechStats(item)} />)}
          {breakthrough && (
            <>
              <SectionTitle as="div" className="player-sec">{t('players.breakthrough')}</SectionTitle>
              <Component item={breakthrough} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
