import { useDeferredValue, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { componentById, componentsOf } from '../../domain/components';
import { emptyHoldings, HOLDING_FIELD, upgradesOf, upgradeTech, type ComponentGroup } from '../../domain/holdings';
import { opponentsBySeat } from '../../domain/players';
import { hasLevelTwo, isUniqueShip, SHIP_KINDS, unitStats } from '../../domain/unitStats';
import type { ComponentDef, DataPack, Game, GameState, LeaderState } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { ComponentCard } from '../components/ComponentCard';
import { ComponentSearchField } from '../components/ComponentSearchField';
import { useComponentSearch } from '../components/useComponentSearch';
import { DrawerSheet } from '../overlays/Drawer';
import { shortName } from '../players/names';
import { ShipNotes, StatLine } from '../players/ShipStats';
import { PlayerChoice, playerStyle, playerTag } from '../primitives/player';
import { Section } from '../primitives/Section';
import { Stepper } from '../primitives/Stepper';
import { UnitIcon } from '../units/UnitIcon';

export interface ComponentsPanelProps {
  game: Game;
  pack: DataPack;
  /** The state the map shows: mine, with every opponent in `rivals`. */
  state: GameState;
  /** What the entries of the plan brought, by player and component id, with the round: not to take off here. */
  rounds: Record<string, Record<string, number>>;
  /** The group of the fan whose sections the sheet shows; a query shows its results whatever the group. */
  group: ComponentGroup;
  /** Whose components are shown: an opponent's id, null for mine. The tabs count the same player. */
  chosen: string | null;
  onChoose: (player: string | null) => void;
}

/** The sections of each group, in the order the sheet shows them. */
const GROUP_SECTIONS: Record<ComponentGroup, string[]> = {
  technologies: ['technologies'],
  cards: ['actionCards', 'promissory'],
  faction: ['leaders', 'breakthrough'],
  relics: ['relics'],
  objectives: ['objectives', 'laws'],
};

/** A leader by hand goes round: locked, unlocked, exhausted, purged, and locked again. */
const NEXT_LEADER: Record<LeaderState | 'locked', LeaderState | null> = { locked: 'unlocked', unlocked: 'exhausted', exhausted: 'purged', purged: null };

const unique = (ids: string[]): string[] => [...new Set(ids)];

/**
 * Everything a player holds, mine or an opponent's, in sections by kind; a query turns the sheet into one list of what
 * it finds, what the player holds first, the rest with a control that adds it. Marks made here are what the player held
 * when the plan begins; what an entry of the plan brought says its round and is changed in that entry.
 */
export function ComponentsPanel({ game, pack, state, rounds, group, chosen, onChoose }: ComponentsPanelProps) {
  const { t } = useTranslation();
  const setStartHolding = useGame(s => s.setStartHolding);
  const setLeader = useGame(s => s.setLeader);
  const [query, setQuery] = useState('');
  const asked = useDeferredValue(query);
  const find = useComponentSearch(pack);
  const found = useMemo(() => find(asked), [find, asked]);

  const rival = game.opponents.find(o => o.id === chosen);
  const player = rival ? rival.id : 'me';
  const faction = rival ? rival.faction : game.faction;
  const holdings = (rival ? state.rivals?.[rival.id]?.holdings : state.holdings) ?? emptyHoldings();
  const start = (rival ? game.start.opponents[rival.id] : game.start.me) ?? {};
  const fromPlan = rounds[player] ?? {};
  const laws = state.laws ?? [];

  const countIn = (list: string[] | undefined, id: string): number => (list ?? []).filter(other => other === id).length;
  const isHeld = (def: ComponentDef): boolean => {
    if (def.kind === 'leader') return holdings.leaders[def.id] !== undefined;
    if (def.kind === 'breakthrough') return def.faction === faction && holdings.breakthrough !== undefined;
    if (def.kind === 'agenda') return laws.includes(def.id);
    if (def.kind === 'secretObjective') return holdings.secrets.includes(def.id) || holdings.scored.includes(def.id);
    const field = HOLDING_FIELD[def.kind];
    return field !== undefined && holdings[field].includes(def.id);
  };

  /** One component as this player has it: what it shows and what can be done with it here. */
  const card = (def: ComponentDef): ReactNode => {
    const source = fromPlan[def.id];
    const tired = holdings.exhausted.includes(def.id) ? 'exhausted' as const : undefined;
    if (def.kind === 'leader') {
      const now = holdings.leaders[def.id];
      return (
        <ComponentCard
          key={def.id} def={def} pack={pack} held={now === 'unlocked' || now === 'exhausted'} state={now ?? 'locked'} source={source}
          note={typeof def.detail?.type === 'string' ? def.detail.type : undefined}
          onCycle={() => setLeader(player, def.id, NEXT_LEADER[now ?? 'locked'])}
        />
      );
    }
    if (def.kind === 'breakthrough') {
      const held = isHeld(def);
      return (
        <ComponentCard
          key={def.id} def={def} pack={pack} held={held} state={holdings.breakthrough === 'exhausted' && held ? 'exhausted' : undefined} source={source}
          onRemove={held && start.breakthrough ? () => setStartHolding(player, def.id, false) : undefined}
          onAdd={!held && def.faction === faction ? () => setStartHolding(player, def.id, true) : undefined}
        />
      );
    }
    const field = HOLDING_FIELD[def.kind];
    if (!field) return <ComponentCard key={def.id} def={def} pack={pack} held={isHeld(def)} />;
    const count = countIn(holdings[field], def.id);
    const scored = def.kind === 'secretObjective' && holdings.scored.includes(def.id);
    const held = count > 0 || scored;
    const atStart = countIn(start[field], def.id);
    const add = () => setStartHolding(player, def.id, true);
    const note = scored || (held && def.kind === 'publicObjective') ? t('components.scored') : held && def.kind === 'secretObjective' ? t('components.inHand') : undefined;
    if (field === 'hand' && held) {
      // The copies an entry brought stay: the stepper changes only those held from the start.
      return (
        <ComponentCard key={def.id} def={def} pack={pack} held state={tired} count={count} source={source}>
          <Stepper
            name={t('components.inHand')} value={count} min={Math.max(0, count - atStart)}
            onChange={value => setStartHolding(player, def.id, value > count)}
          />
        </ComponentCard>
      );
    }
    return (
      <ComponentCard
        key={def.id} def={def} pack={pack} held={held} state={held ? tired : undefined} note={note} source={source}
        onRemove={held && atStart > 0 && source === undefined ? () => setStartHolding(player, def.id, false) : undefined}
        onAdd={held ? undefined : add}
      />
    );
  };

  /** The components under these ids that the data still knows, each once. */
  const known = (ids: string[]): ComponentDef[] => unique(ids).flatMap(id => componentById(pack, id) ?? []);

  const upgraded = upgradesOf(holdings, pack);
  const unitCards = SHIP_KINDS.flatMap(kind => {
    const base = unitStats(faction, kind, false, pack);
    const current = unitStats(faction, kind, upgraded.includes(kind), pack);
    if (!base || !current) return [];
    const hasTwo = hasLevelTwo(faction, kind, pack);
    const on = current !== base;
    const technology = upgradeTech(pack, faction, kind);
    const round = technology === undefined ? undefined : fromPlan[technology];
    return [{
      technology,
      card: (
        <button
          key={kind} type="button" className={`upgrade-card${on ? ' on' : ''}`} data-testid={`upgrade-${kind}`} aria-pressed={on}
          disabled={!hasTwo || !technology || round !== undefined} onClick={() => technology && setStartHolding(player, technology, !on)}
        >
          <UnitIcon unit={kind} />
          <span className="upgrade-body">
            <b>{t(`unit.${kind}`)}</b>
            {isUniqueShip(faction, kind, pack) && <small>{current.name}</small>}
            {round !== undefined && <small className="ship-row-round">{t('components.fromRound', { n: round })}</small>}
            <StatLine base={base} current={current} />
            <ShipNotes stat={current} pack={pack} />
          </span>
          <span className="upgrade-level">{hasTwo ? (on ? 'II' : 'I') : '—'}</span>
        </button>
      ),
    }];
  });
  // A unit card stands for its upgrade technology: that one is not listed a second time.
  const onUnitCards = new Set(unitCards.map(unit => unit.technology));

  const ownLeaders = componentsOf(pack).filter(c => c.kind === 'leader' && c.faction === faction).map(c => c.id);
  const breakthrough = holdings.breakthrough ? componentsOf(pack).filter(c => c.kind === 'breakthrough' && c.faction === faction) : [];
  const sections: [string, ReactNode[]][] = [
    ['technologies', [...known(holdings.technologies).filter(c => !onUnitCards.has(c.id)).map(card), ...unitCards.map(unit => unit.card)]],
    ['actionCards', known(holdings.hand).map(card)],
    ['relics', known(holdings.relics).map(card)],
    ['promissory', known(holdings.promissory).map(card)],
    ['leaders', known([...ownLeaders, ...Object.keys(holdings.leaders)]).map(card)],
    ['breakthrough', breakthrough.map(card)],
    ['objectives', known([...holdings.scored, ...holdings.secrets]).map(card)],
    ['laws', known(laws).map(card)],
  ];

  const searching = asked.trim() !== '';
  // What the player held when the query was asked stands first. A component added from the list stays where it is:
  // moved up, it would bring the control of another card under the finger.
  const asking = `${player}\n${asked}`;
  const [heldFirst, setHeldFirst] = useState<{ asking: string; ids: string[] }>({ asking: '', ids: [] });
  const first = heldFirst.asking === asking ? heldFirst.ids : found.filter(isHeld).map(def => def.id);
  if (heldFirst.asking !== asking) setHeldFirst({ asking, ids: first });
  const mine = found.filter(def => first.includes(def.id));
  const rest = found.filter(def => !first.includes(def.id));

  return (
    <DrawerSheet className="components-panel" title={t('components.title')} style={playerStyle('--player', rival ? rival.color : game.color)}>
      <PlayerChoice
        label={t('components.whose')}
        chosen={value => (value === null ? !rival : rival?.id === value)} onPick={onChoose}
        options={[
          { value: null, label: t('plan.mine'), color: game.color },
          ...opponentsBySeat(game).map(o => {
            const name = shortName(pack, o.faction, t('players.player', { n: o.seat }));
            return { value: o.id, label: name, color: o.color, tag: playerTag(name, Boolean(pack.factions[o.faction]), o.seat) };
          }),
        ]}
      />
      <ComponentSearchField value={query} onChange={setQuery} />
      {searching
        ? (
          <Section label={t('components.results')} title={t('components.results')}>
            {found.length === 0 && <span className="muted">{t('components.nothing')}</span>}
            {mine.map(card)}
            {rest.map(card)}
          </Section>
        )
        : sections.filter(([key]) => GROUP_SECTIONS[group].includes(key)).map(([key, cards]) => {
          const title = t(`components.section.${key}`);
          return cards.length === 0
            ? <Section key={key} label={title} title={title} headAction={<span className="muted">{t('components.none')}</span>} />
            : <Section key={key} label={title} title={title} collapsible>{cards}</Section>;
        })}
    </DrawerSheet>
  );
}
