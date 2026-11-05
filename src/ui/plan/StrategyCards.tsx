import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cardSummary } from '../../data/cardSummaries';
import { strategyCards } from '../../domain/cards';
import type { ExpansionId, Round } from '../../domain/types';
import { currentLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';

export interface StrategyCardsProps {
  expansions: ExpansionId[];
  round: Round;
}

/** One tap makes a card the main one, the next the backup, the next clears it. Starts collapsed once a card is chosen. */
export function StrategyCards({ expansions, round }: StrategyCardsProps) {
  const { t } = useTranslation();
  const setStrategyCard = useGame(s => s.setStrategyCard);
  const [open, setOpen] = useState(round.strategyCard === null && round.backupCard === null);
  const lang = currentLanguage();
  const cards = strategyCards(expansions)
    .filter(c => open || c.initiative === round.strategyCard || c.initiative === round.backupCard);

  return (
    <div className="plan-cards">
      <div className="panel-head">
        <h3>{t('plan.cards.title')}</h3>
        <button type="button" onClick={() => setOpen(!open)}>{open ? t('plan.cards.collapse') : t('plan.cards.all')}</button>
      </div>
      <ul className="card-list">
        {cards.map(card => {
          const summary = cardSummary(card.summaryKey, lang);
          const main = card.initiative === round.strategyCard;
          const backup = card.initiative === round.backupCard;
          return (
            <li key={card.initiative}>
              <button
                type="button" onClick={() => setStrategyCard(round.number, card.initiative)}
                className={`strategy-card${main ? ' card-main' : ''}${backup ? ' card-backup' : ''}`}
              >
                <span className="card-number">{card.initiative}</span>
                <span className="card-title">
                  {card.name}
                  {main && <span className="pill">{t('plan.cards.main')}</span>}
                  {backup && <span className="pill">{t('plan.cards.backup')}</span>}
                  {card.changedIn === 'te' && <span className="pill pill-change">{t('plan.cards.changed')}</span>}
                </span>
                <span className="card-text">{t('plan.cards.primary')} {summary.primary}</span>
                <span className="card-text">{t('plan.cards.secondary')} {summary.secondary}</span>
                {summary.change && <span className="card-note">{summary.change}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
