import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { strategyCards } from '../../data/loadPack';
import { textOf } from '../../domain/components';
import { cardsHeld } from '../../domain/strategy';
import type { ExpansionId } from '../../domain/types';
import type { Round } from '../../game/round';
import { useGame } from '../../state/gameStore';
import { usePack } from '../common/usePack';
import { SectionTitle } from '../primitives/SectionTitle';
import { CardGrid } from './blocks/CardGrid';

export interface StrategyCardsProps {
  expansions: ExpansionId[];
  playerCount: number;
  round: Pick<Round, 'number' | 'strategyCard' | 'backupCard'>;
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
    // On the finished tap, not on the press: closing moves the layout, and a press that moved its target is no click.
    const away = (e: MouseEvent) => {
      if (!block.current?.contains(e.target as Node)) setShown(null);
    };
    window.addEventListener('click', away, { capture: true });
    return () => window.removeEventListener('click', away, { capture: true });
  }, [shown]);
  const pack = usePack(expansions);
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

  return (
    <div className="plan-cards" ref={block}>
      <SectionTitle as="h4" className="phase-title">{t('plan.phases.strategy')}</SectionTitle>
      <CardGrid
        label={t('plan.phases.strategy')} cards={cards}
        cellOf={card => {
          const main = card.initiative === round.strategyCard;
          const backup = card.initiative === round.backupCard;
          return {
            className: `${main ? ' card-main' : ''}${backup ? ' card-backup' : ''}${card.initiative === shown ? ' card-shown' : ''}`,
            current: card.initiative === shown,
            onClick: () => tap(card.initiative),
            // The line is always there: a row that grew with it would move the row under it from under the finger.
            extra: main ? <small>{t('plan.cards.main')}</small> : backup ? <small>{backupName}</small> : <small aria-hidden="true">{'\u00a0'}</small>,
          };
        }}
      />
      {choice ? <p className="card-choice">{choice}</p> : <p className="muted card-hint">{t('plan.phases.strategyEmpty')}</p>}
      <p className="muted card-hint">{t(cardsHeld(playerCount) > 1 ? 'plan.cards.hintTwo' : 'plan.cards.hint')}</p>
      {details && (
        <div className="card-details" role="group" aria-label={details.name}>
          <span className="card-title">
            {details.name}
            {details.changedIn === 'te' && <span className="pill pill-change">{t('plan.cards.changed')}</span>}
          </span>
          <div className="card-ability card-ability-primary"><b>{t('plan.cards.primary')}</b><span>{textOf(pack, `strategy:${details.id}`)}</span></div>
          <div className="card-ability card-ability-secondary"><b>{t('plan.cards.secondary')}</b><span>{textOf(pack, `strategy:${details.id}#secondary`)}</span></div>
        </div>
      )}
    </div>
  );
}
