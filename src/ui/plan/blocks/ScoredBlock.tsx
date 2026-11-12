import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { componentById } from '../../../domain/components';
import { readyPlanetIds } from '../../../domain/payment';
import type { DataPack, Entry, GameState, StatusSpend } from '../../../domain/types';
import { ComponentCard } from '../../components/ComponentCard';
import { ComponentPicker } from '../../components/ComponentPicker';
import { Section } from '../../primitives/Section';
import { Stepper } from '../../primitives/Stepper';

type StatusEntry = Extract<Entry, { type: 'statusTokens' }>;

export interface ScoredBlockProps {
  entry: StatusEntry;
  pack: DataPack;
  /** The state of the entry's owner just before it: the secret objectives in hand and the public ones revealed stand first. */
  before?: GameState;
  /** The fields that changed; `scored` and `spend` come without a value when they became empty. */
  onChange: (patch: { scored?: string[]; spend?: StatusSpend }) => void;
}

/** An objective is scored by spending when its text begins with "Spend" (61.10). */
const costs = (text: string): boolean => /^spend\b/i.test(text.trim());

const emptySpend = (spend: StatusSpend): boolean =>
  !spend.tactic && !spend.fleet && !spend.strategy && !spend.tradeGoods && !(spend.resources?.planets.length) && !(spend.influence?.planets.length);

/**
 * The objectives a status entry scores (81.1), each a card with its cross, and under them, when one of them is scored
 * by spending (61.10), what the scoring cost: tokens from the pools, trade goods and the planets exhausted. The button
 * stands over the cards, so a card added moves nothing. The requirement of an objective is not asked here: the replay
 * warns when it is not met, in the warnings of the entry.
 */
export function ScoredBlock({ entry, pack, before, onChange }: ScoredBlockProps) {
  const { t } = useTranslation();
  const [picking, setPicking] = useState(false);
  const scored = entry.scored ?? [];
  const defs = scored.flatMap(id => componentById(pack, id) ?? []);
  const owned = useMemo(() => new Set([...(before?.holdings.secrets ?? []), ...(before?.revealed ?? []).filter(id => !before?.holdings.scored.includes(id))]), [before]);
  const spend = entry.spend ?? {};
  const setSpend = (patch: StatusSpend) => {
    const next = { ...spend, ...patch };
    onChange({ spend: emptySpend(next) ? undefined : next });
  };
  const planets = before ? readyPlanetIds(before) : [];
  const group = (field: 'resources' | 'influence', label: string) => {
    const chosen = spend[field]?.planets ?? [];
    const toggle = (id: string) => setSpend({ [field]: { planets: chosen.includes(id) ? chosen.filter(p => p !== id) : [...chosen, id], tradeGoods: 0 } });
    return (
      <div className="pay-planets" role="group" aria-label={label}>
        {planets.filter(id => (pack.planets[id]?.[field] ?? 0) > 0).map(id => (
          <button key={id} type="button" aria-pressed={chosen.includes(id)} onClick={() => toggle(id)}>{pack.planets[id]?.name ?? id} {pack.planets[id]?.[field]}</button>
        ))}
      </div>
    );
  };
  return (
    <>
      <Section label={t('plan.entries.scored')} title={t('plan.entries.scored')}>
        <span className="muted">{t('plan.entries.scoredHint')}</span>
        <div className="side-actions"><button type="button" onClick={() => setPicking(true)}>{t('plan.entries.scoreOne')}</button></div>
        {defs.map((def, index) => (
          <ComponentCard
            key={`${def.id}-${index}`} def={def} pack={pack} held note={t('plan.entries.scoredNote')}
            onRemove={() => { const rest = scored.filter(id => id !== def.id); onChange({ scored: rest.length > 0 ? rest : undefined }); }}
          />
        ))}
      </Section>
      {defs.some(def => costs(pack.originalTexts?.[def.id] ?? pack.texts[def.id] ?? '')) && (
        <Section label={t('plan.entries.spend')} title={t('plan.entries.spend')}>
          <span className="muted">{t('plan.entries.spendHint')}</span>
          <Stepper name={t('plan.summary.tactic')} value={spend.tactic ?? 0} min={0} onChange={tactic => setSpend({ tactic })} />
          <Stepper name={t('plan.summary.strategy')} value={spend.strategy ?? 0} min={0} onChange={strategy => setSpend({ strategy })} />
          <Stepper name={t('plan.payment.tradeGood')} value={spend.tradeGoods ?? 0} min={0} onChange={tradeGoods => setSpend({ tradeGoods })} />
          {group('resources', t('plan.entries.spendResources'))}
          {group('influence', t('plan.entries.spendInfluence'))}
        </Section>
      )}
      {picking && (
        <ComponentPicker
          kinds={['publicObjective', 'secretObjective']} player={entry.owner ?? 'me'} owned={owned} prefer="owned" onClose={() => setPicking(false)}
          onPick={id => { onChange({ scored: [...scored, id] }); setPicking(false); }}
        />
      )}
    </>
  );
}
