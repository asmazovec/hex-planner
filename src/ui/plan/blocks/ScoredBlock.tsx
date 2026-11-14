import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { componentById } from '../../../domain/components';
import type { DataPack, StatusSpend } from '../../../domain/types';
import type { Turn } from '../../../game/actions';
import { withScored, withSpend } from '../../../game/edit/turn';
import { legacyKey } from '../../../game/keys';
import { payingPlanets } from '../../../game/queries';
import { shelfOf } from '../../../game/shelf';
import { ComponentCard } from '../../components/ComponentCard';
import { ComponentPicker } from '../../components/ComponentPicker';
import { Section } from '../../primitives/Section';
import { Stepper } from '../../primitives/Stepper';
import type { KernelView } from '../kernelView';

export interface ScoredBlockProps {
  /** A turn of the status phase. */
  turn: Turn;
  pack: DataPack;
  /** The table and the board just before the entry: the secret objectives in hand and the public ones revealed stand first. */
  view?: KernelView;
  /** The turn with the objectives or the spending changed; they are gone from it when they became empty. */
  onChange: (turn: Turn) => void;
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
export function ScoredBlock({ turn, pack, view, onChange }: ScoredBlockProps) {
  const { t } = useTranslation();
  const [picking, setPicking] = useState(false);
  const status = turn.action.kind === 'status' ? turn.action : undefined;
  const scored = status?.scored ?? [];
  const defs = scored.flatMap(id => componentById(pack, id) ?? []);
  const player = view && turn.player;
  const owned = useMemo(() => {
    if (!view || player === undefined) return new Set<string>();
    const held = shelfOf(view.table, view.board, player);
    return new Set([...held.secrets, ...view.board.common.revealed.filter(id => !held.scored.includes(id))]);
  }, [view, player]);
  const spend = status?.spend ?? {};
  const setSpend = (patch: StatusSpend) => {
    const next = { ...spend, ...patch };
    onChange(withSpend(turn, emptySpend(next) ? undefined : next));
  };
  const planets = view && player !== undefined ? payingPlanets(view.table, view.board, pack, player) : [];
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
            onRemove={() => { const rest = scored.filter(id => id !== def.id); onChange(withScored(turn, rest)); }}
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
          kinds={['publicObjective', 'secretObjective']} player={view ? legacyKey(view.table, turn.player) : 'me'} owned={owned} prefer="owned" onClose={() => setPicking(false)}
          onPick={id => { onChange(withScored(turn, [...scored, id])); setPicking(false); }}
        />
      )}
    </>
  );
}
