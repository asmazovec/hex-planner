import { useTranslation } from 'react-i18next';
import { sheetSummary } from '../../data/sheetSummaries';
import { factionSheet } from '../../domain/factionSheet';
import type { ComponentPack, ExpansionId, FactionDef, SheetItem, SheetMech } from '../../domain/types';
import { currentLanguage } from '../../i18n';

const PACK_NAMES: Record<ComponentPack, string> = { base: 'Base', pok: 'Prophecy of Kings', te: "Thunder's Edge" };

function Component({ item, kicker, extra }: { item: SheetItem; kicker?: string; extra?: string }) {
  const { t } = useTranslation();
  const summary = sheetSummary(item.id, currentLanguage());
  return (
    <div className="sheet-item" data-testid="sheet-item">
      <div className="sheet-head">
        <b>{item.name}</b>
        {kicker && <span className="sheet-kicker">{kicker}</span>}
        <span className={`sheet-pack sheet-pack-${item.pack}`} title={t('players.fromPack', { pack: PACK_NAMES[item.pack] })}>{PACK_NAMES[item.pack]}</span>
      </div>
      {extra && <span className="sheet-stats">{extra}</span>}
      {summary?.text && <p>{summary.text}</p>}
      {summary?.unlock && <p className="sheet-unlock">{t('players.unlock', { text: summary.unlock })}</p>}
    </div>
  );
}

/** A faction's abilities, leaders, mech and breakthrough: only what the chosen expansions bring, each signed with where it comes from. */
export function FactionComponents({ faction, expansions }: { faction: FactionDef; expansions: ExpansionId[] }) {
  const { t } = useTranslation();
  const { abilities, leaders, mechs, breakthrough } = factionSheet(faction, expansions);
  const mechStats = (mech: SheetMech): string => [
    mech.cost !== null ? `${t('ships.cost')} ${mech.cost}` : null,
    mech.combat !== null ? `${t('ships.combat')} ${mech.dice > 1 ? `${mech.combat}×${mech.dice}` : mech.combat}` : null,
    mech.sustain ? t('ships.sustain') : null,
  ].filter(Boolean).join(' · ');
  return (
    <div className="player-sheet">
      <div>
        <div className="player-sec">{t('players.abilities')}</div>
        {abilities.map(item => <Component key={item.id} item={item} />)}
      </div>
      {leaders.length > 0 && (
        <div>
          <div className="player-sec">{t('players.leaders')}</div>
          {leaders.map(item => <Component key={item.id} item={item} kicker={t(`players.leader.${item.type}`)} />)}
        </div>
      )}
      {(mechs.length > 0 || breakthrough) && (
        <div>
          {mechs.length > 0 && <div className="player-sec">{t('players.mech')}</div>}
          {mechs.map(item => <Component key={item.id} item={item} extra={mechStats(item)} />)}
          {breakthrough && (
            <>
              <div className="player-sec">{t('players.breakthrough')}</div>
              <Component item={breakthrough} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
