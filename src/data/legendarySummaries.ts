type Lang = 'ru' | 'en';

// Own short retellings for the player's memory, not card text. The card itself decides in play.
// Keyed by the ability name, since Mallice and Locked Mallice share one ability.
const SUMMARIES: Record<string, Record<Lang, string>> = {
  'The Nucleus': {
    ru: 'Действие: истощите карту, чтобы применить способность Star Forge Embers of Muaat, не тратя жетон команд.',
    en: 'Action: exhaust to use the Star Forge ability of the Embers of Muaat without paying a command token.',
  },
  "Custodian's Favour": {
    ru: 'Пока вы держите Mecatol Rex, у него Космическая пушка 5 и Производство 3. Когда другой игрок получает очко картой Imperial по её второму условию, вы берёте 2 жетона команд.',
    en: 'Mecatol Rex, while you hold it, gets Production 3 plus Space Cannon 5. Whenever another player scores a point through the second clause of Imperial, you gain 2 command tokens.',
  },
  'The Acropolis': {
    ru: 'В конце своего хода истощите, чтобы подготовить другой компонент, кроме стратегической карты.',
    en: 'As your turn ends, exhaust to ready another component, except a strategy card.',
  },
  'Maxis Central Control': {
    ru: 'Пасуя, истощите, чтобы взять под контроль планету без юнитов и без прикреплённых карт, если она не домашняя и не легендарная.',
    en: 'When you pass, exhaust to take control of a planet with no units and no attachments, as long as it is neither a home planet nor a legendary one.',
  },
  "Dok 'N Pic's Salvage Yard": {
    ru: 'Пасуя, истощите, чтобы выложить на эту карту лицом вверх одну карту действий из сброса. Карты на ней можно разыгрывать, как с руки, сбросив их навсегда.',
    en: 'When you pass, exhaust to take an action card out of the discard pile and set it face up on this card. Cards stored here may be played as though in your hand, each one purged after use.',
  },
  'Imperial Arms Vault': {
    ru: 'В конце своего хода истощите, чтобы поставить 1 меха из запаса на любую свою планету либо взять 1 карту действий.',
    en: 'As your turn ends, exhaust to set 1 mech from reinforcements down on a planet of yours (any), or to draw 1 action card.',
  },
  'Aeurex Mechanica': {
    ru: 'Пасуя, истощите, чтобы поставить из запаса 1 корабль того типа, чьё улучшение вы изучили, в систему с вашими кораблями.',
    en: 'When you pass, exhaust to place from reinforcements 1 ship of a type whose unit upgrade you own, in a system with your ships.',
  },
  'Exterrix Headquarters': {
    ru: 'В конце своего хода истощите, чтобы получить 2 товара или обменять всю свою продукцию на товары.',
    en: 'As your turn ends, exhaust for 2 trade goods, or swap every commodity you hold for trade goods.',
  },
  'Mirage Flight Academy': {
    ru: 'В конце своего хода истощите, чтобы поставить из запаса до 2 истребителей в любую систему с вашими кораблями.',
    en: 'As your turn ends, exhaust to put up to 2 fighters from reinforcements in any system with your ships.',
  },
  'The Galactic Council': {
    ru: 'В конце своего хода истощите и сбросьте 1 тайную цель, чтобы взять 1 тайную цель.',
    en: 'As your turn ends, exhaust and throw away one secret objective in exchange for a fresh one from the deck.',
  },
  '4X41D "Hyperion" VI': {
    ru: 'Пасуя, истощите, чтобы взять 1 карту действий и 1 жетон команд.',
    en: 'Passing lets you exhaust this to draw an action card and take 1 command token.',
  },
  'The Atrament': {
    ru: 'В конце своего хода истощите, чтобы поставить из запаса до 2 пехоты на любую свою планету.',
    en: 'As your turn ends, exhaust to set up to 2 infantry from reinforcements down on any planet of yours.',
  },
  'A Song Like Marrow': {
    ru: 'Получив эту карту, вы берёте 1 очко победы; потеряв её, теряете 1 очко.',
    en: 'Gaining this card gives you 1 victory point; losing it costs you 1 victory point.',
  },
  'Ionian Fuel Refinery': {
    ru: 'После активации системы истощите, чтобы дать одному своему кораблю +1 к движению на это тактическое действие.',
    en: 'After you activate a system, exhaust to give one of your ships +1 move for this tactical action.',
  },
  'Jupiter Brain': {
    ru: 'Получив эту карту, вы сразу получаете свой прорыв, если его ещё нет. В конце своего хода истощите, чтобы совершить ещё одно действие.',
    en: 'When you gain this card you also gain your breakthrough, if you do not have it yet. As your turn ends, exhaust to take another action.',
  },
};

/** Own short retelling of a legendary planet ability, or null if there is none. */
export const legendarySummary = (ability: string, language: Lang): string | null => SUMMARIES[ability]?.[language] ?? null;
