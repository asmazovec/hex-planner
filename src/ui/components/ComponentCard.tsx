import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { textOf } from '../../domain/components';
import type { ComponentDef, ComponentPack, DataPack, LeaderState } from '../../domain/types';
import { EXPANSION_NAMES } from '../common/expansions';
import { TechMark } from '../map/marks';
import { HexRemove, RowIcon } from '../primitives/Icon';
import { PlayerDot } from '../primitives/player';

const LEADER_TYPES = ['agent', 'commander', 'hero'];

const PACK_NAMES: Record<ComponentPack, string> = { base: 'Base', ...EXPANSION_NAMES };

/** How a component stands with its player, beyond being held: a leader may also be locked or purged. */
export type CardState = LeaderState | 'locked';

export interface ComponentCardProps {
  def: ComponentDef;
  pack: DataPack;
  /** The player has it: the edge of what is chosen. */
  held?: boolean;
  /** Said under the name; an exhausted or purged component stands dimmed. */
  state?: CardState;
  /** Said under the name as it is: "in hand", "scored". */
  note?: string;
  /** Whose card it is, whoever holds it: the player a promissory note belongs to, by name and colour. */
  owner?: { name: string; color: number };
  /** Where it is now, said on a line of its own: one's own note in hand, with another player (in their colour), out of the game. */
  where?: { label: string; color?: number };
  /** The text as it reads in this game instead of the printed one: a generic note names its owner. */
  text?: string;
  /** How many copies are held; said from two on. */
  count?: number;
  /** The round whose entry of the plan brought it. */
  source?: number;
  /** Given, the cross inside the card takes the component off. */
  onRemove?: () => void;
  /** Given, a plus inside the card adds the component; `pickLabel` names it for a choice instead. */
  onAdd?: () => void;
  pickLabel?: string;
  /** A leader whose state is chosen under the row of the card: the row does not say the state, and says how the leader unlocks without being opened. */
  leader?: boolean;
  /** Under the row of the card: the stepper of a hand, the states of a leader. */
  children?: ReactNode;
}

const TECH = 'technology:';

/**
 * One component as a card, one frame: its head with the name, kind and expansion, and its printed text as its own
 * details, word for word. The details are folded; a press on the head opens them inside the card, under the head, which
 * stays where it is. A technology says its type by a mark at its name. Whatever changes the component stands inside
 * the card, at the right edge of its head.
 */
export function ComponentCard({ def, pack, held, state, note, owner, where, text, count, source, onRemove, onAdd, pickLabel, leader, children }: ComponentCardProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const details = useId();
  const technology = def.kind === 'technology' ? pack.technologies[def.id.slice(TECH.length)] : undefined;
  const techName = technology?.type ? t(`map.tech.${technology.type}`) : technology?.upgrade ? t('components.unitUpgrade') : undefined;
  const unlock = textOf(pack, `${def.id}#unlock`);
  const dim = state === 'exhausted' || state === 'purged';
  const faction = def.faction ? pack.factions[def.faction]?.name : undefined;
  const stateName = state && t(`components.state.${state}`);
  // A leader is named by its type: agent, commander or hero.
  const type = def.kind === 'leader' && typeof def.detail?.type === 'string' && LEADER_TYPES.includes(def.detail.type) ? def.detail.type : undefined;
  const facts = [
    type ? t(`players.leader.${type}`) : t(`components.kind.${def.kind}`), faction, PACK_NAMES[def.pack],
    !leader && state && state !== 'unlocked' ? stateName : undefined, note, source !== undefined ? t('components.fromRound', { n: source }) : undefined,
  ].filter(Boolean);
  const addLabel = pickLabel ?? t('components.add', { name: def.name });
  const control = onRemove ? <HexRemove label={t('components.remove', { name: def.name })} onClick={onRemove} />
    : onAdd ? <button type="button" className="icon-button" aria-label={addLabel} title={addLabel} onClick={onAdd}><RowIcon name="add" /></button>
      : null;
  return (
    <div className={`component-card${held ? ' on' : ''}${dim ? ' dim' : ''}`} data-testid={`component-${def.id}`}>
      <div className="in-card">
        <button type="button" className="source-button component-head" aria-expanded={open} aria-controls={open ? details : undefined} onClick={() => setOpen(!open)}>
          <b>{def.name}</b>
          {techName && (
            <span className={`component-mark${technology?.type ? '' : ' component-mark-upgrade'}`} role="img" aria-label={techName} title={techName}>
              {technology?.type ? <TechMark type={technology.type} size={11} /> : 'II'}
            </span>
          )}
          {count !== undefined && count > 1 && <span className="component-count"> ×{count}</span>}
          {owner && <small className="component-owner"><PlayerDot color={owner.color} />{owner.name}</small>}
          {where && <small className="component-owner">{where.color !== undefined && <PlayerDot color={where.color} />}{where.label}</small>}
          <small>{facts.join(' · ')}</small>
          {leader && unlock && <small>{t('players.unlock', { text: unlock })}</small>}
        </button>
        {control}
      </div>
      {open && (
        <p id={details} className="component-text">
          {(text ?? def.text) || t('components.noText')}
          {unlock && !leader && <span className="muted">{`\n${t('players.unlock', { text: unlock })}`}</span>}
        </p>
      )}
      {children}
    </div>
  );
}
