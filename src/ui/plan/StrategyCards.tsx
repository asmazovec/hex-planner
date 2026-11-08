import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cardSummary } from '../../data/cardSummaries';
import { strategyCards } from '../../data/loadPack';
import { cardsHeld } from '../../domain/strategy';
import type { ExpansionId, Round } from '../../domain/types';
import { currentLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';

export interface StrategyCardsProps {
  expansions: ExpansionId[];
  playerCount: number;
  round: Round;
}

/**
 * All eight cards in a grid that only plans. The details are those of the main card, until a tap opens another look: the
 * first tap on any card, the main one too, only shows it and takes nothing. Further taps on it make it the backup, then
 * the main one, then clear it. A tap outside this block ends the look, so the count starts over from the first tap.
 * With 3 or 4 players two cards are held, so the backup is the second card.
 */
export function StrategyCards({ expansions, playerCount, round }: StrategyCardsProps) {
  const { t } = useTranslation();
  const setStrategyCard = useGame(s => s.setStrategyCard);
  /** The card being looked at, which further taps change. */
  const [shown, setShown] = useState<number | null>(null);
  const block = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (shown === null) return undefined;
    const away = (e: PointerEvent) => {
      if (!block.current?.contains(e.target as Node)) setShown(null);
    };
    window.addEventListener('pointerdown', away);
    return () => window.removeEventListener('pointerdown', away);
  }, [shown]);
  const lang = currentLanguage();
  const cards = strategyCards(expansions);
  const backupName = t(cardsHeld(playerCount) > 1 ? 'plan.cards.second' : 'plan.cards.backup');
  const tap = (initiative: number) => {
    if (shown !== initiative) {
      setShown(initiative);
      return;
    }
    setStrategyCard(round.number, initiative);
    if (round.strategyCard === initiative) setShown(null);
  };
  const named = (initiative: number | null) => {
    const card = cards.find(c => c.initiative === initiative);
    return card ? `${card.initiative} ${card.name}` : null;
  };
  const choice = [
    round.strategyCard !== null && `${t('plan.cards.main')}: ${named(round.strategyCard)}`,
    round.backupCard !== null && `${backupName}: ${named(round.backupCard)}`,
  ].filter(Boolean).join(' · ');
  const details = cards.find(c => c.initiative === (shown ?? round.strategyCard));
  const summary = details && cardSummary(details.summaryKey, lang);

  return (
    <div className="plan-cards" ref={block}>
      <h4 className="phase-title">{t('plan.phases.strategy')}</h4>
      {/* TODO(P2-384) #ws:ui-containers #type:dup #size:s #dep:P2-335 — та же сетка карт, что в StrategyEditor */}
      <div className="card-grid" role="group" aria-label={t('plan.phases.strategy')}>
        {cards.map(card => {
          const main = card.initiative === round.strategyCard;
          const backup = card.initiative === round.backupCard;
          return (
            <button
              key={card.initiative} type="button" onClick={() => tap(card.initiative)} aria-current={card.initiative === shown ? 'true' : undefined}
              className={`card-cell${main ? ' card-main' : ''}${backup ? ' card-backup' : ''}${card.initiative === shown ? ' card-shown' : ''}`}
            >
              <b>{card.initiative}</b>{card.name}
              {main && <small>{t('plan.cards.main')}</small>}
              {backup && <small>{backupName}</small>}
            </button>
          );
        })}
      </div>
      {choice ? <p className="card-choice">{choice}</p> : <p className="muted card-hint">{t('plan.phases.strategyEmpty')}</p>}
      <p className="muted card-hint">{t(cardsHeld(playerCount) > 1 ? 'plan.cards.hintTwo' : 'plan.cards.hint')}</p>
      {details && summary && (
        <div className="card-details" role="group" aria-label={details.name}>
          <span className="card-title">
            {details.name}
            {details.changedIn === 'te' && <span className="pill pill-change">{t('plan.cards.changed')}</span>}
          </span>
          <div className="card-ability card-ability-primary"><b>{t('plan.cards.primary')}</b><span>{summary.primary}</span></div>
          <div className="card-ability card-ability-secondary"><b>{t('plan.cards.secondary')}</b><span>{summary.secondary}</span></div>
          {summary.change && <span className="card-note">{summary.change}</span>}
        </div>
      )}
    </div>
  );
}
