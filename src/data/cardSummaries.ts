export interface CardSummary {
  primary: string;
  secondary: string;
  change?: string;
}
type Lang = 'ru' | 'en';

// Paraphrases, not card text. Game terms stay in English in both languages.
const SUMMARIES: Record<string, Record<Lang, CardSummary>> = {
  pok1leadership: {
    ru: {
      primary: 'Получите 3 жетона команд. Затем можно потратить влияние: 1 жетон за каждые 3 влияния.',
      secondary: 'Потратьте влияние: 1 жетон команд за каждые 3 влияния.',
    },
    en: {
      primary: 'Take 3 command tokens, then pay influence for more at 1 token per 3 influence.',
      secondary: 'Pay influence for command tokens at 1 token per 3 influence.',
    },
  },
  base2: {
    ru: {
      primary: 'Выберите систему со своей планетой, кроме Mecatol Rex: остальные игроки кладут туда жетон из запаса. Подготовьте все свои истощённые планеты в этой системе.',
      secondary: 'Жетон из стратегического пула: подготовьте до 2 истощённых планет.',
    },
    en: {
      primary: 'Pick a system with your planet, other than Mecatol Rex: everyone else puts a reinforcement token there. Ready your exhausted planets in that system.',
      secondary: 'Spend a strategy token to ready up to 2 exhausted planets.',
    },
  },
  pok2diplomacy: {
    ru: {
      primary: 'Выберите систему со своей планетой, кроме Mecatol Rex: остальные игроки кладут туда жетон из запаса. Затем подготовьте до 2 своих истощённых планет.',
      secondary: 'Жетон из стратегического пула: подготовьте до 2 своих истощённых планет.',
    },
    en: {
      primary: 'Pick a system with your planet, other than Mecatol Rex: everyone else puts a reinforcement token there. Then ready up to 2 of your exhausted planets.',
      secondary: 'Spend a strategy token to ready up to 2 of your exhausted planets.',
    },
  },
  pok3politics: {
    ru: {
      primary: 'Передайте жетон спикера другому игроку, возьмите 2 карты действий и разложите 2 верхние карты колоды повесток сверху или снизу.',
      secondary: 'Жетон из стратегического пула: возьмите 2 карты действий.',
    },
    en: {
      primary: 'Hand the speaker token to another player, draw 2 action cards, and sort the top 2 agendas to the top or bottom of the deck.',
      secondary: 'Spend a strategy token to draw 2 action cards.',
    },
  },
  base4: {
    ru: {
      primary: 'Поставьте PDS или Space Dock на свою планету, затем ещё один PDS на свою планету.',
      secondary: 'Положите жетон из стратегического пула в любую систему и можете поставить там на свою планету PDS или Space Dock.',
    },
    en: {
      primary: 'Put a PDS or Space Dock on a planet you control, then one more PDS on a planet you control.',
      secondary: 'Put a strategy token in any system; you may add a PDS or Space Dock on your planet there.',
    },
  },
  pok4construction: {
    ru: {
      primary: 'Поставьте PDS или Space Dock на свою планету, затем ещё один PDS на свою планету.',
      secondary: 'Положите жетон из стратегического пула в любую систему и можете поставить там на свою планету PDS или Space Dock.',
    },
    en: {
      primary: 'Put a PDS or Space Dock on a planet you control, then one more PDS on a planet you control.',
      secondary: 'Put a strategy token in any system; you may add a PDS or Space Dock on your planet there.',
    },
  },
  te4construction: {
    ru: {
      primary: 'Либо поставьте сооружение на свою планету, либо используйте PRODUCTION одного своего Space Dock. Затем поставьте сооружение на свою планету.',
      secondary: 'Жетон из стратегического пула: поставьте сооружение на свою планету.',
      change: "В Thunder's Edge основное действие может заменить первую постройку производством в Space Dock, а дополнительное больше не кладёт жетон в систему.",
    },
    en: {
      primary: 'Either put a structure on a planet you control or use PRODUCTION of one of your Space Docks. Then put a structure on a planet you control.',
      secondary: 'Spend a strategy token to put a structure on a planet you control.',
      change: "In Thunder's Edge the primary can swap the first build for Space Dock production, and the secondary no longer puts a token in a system.",
    },
  },
  pok5trade: {
    ru: {
      primary: 'Получите 3 товара, пополните свои commodities и выберите игроков, которые бесплатно используют дополнительное действие этой карты.',
      secondary: 'Жетон из стратегического пула: пополните свои commodities.',
    },
    en: {
      primary: 'Gain 3 trade goods, replenish commodities, and choose players who use this secondary for free.',
      secondary: 'Spend a strategy token to replenish your commodities.',
    },
  },
  pok6warfare: {
    ru: {
      primary: 'Снимите свой жетон команд с карты и получите 1 жетон. Затем перераспределите жетоны на планшете.',
      secondary: 'Жетон из стратегического пула, который не кладётся на карту: используйте PRODUCTION одного Space Dock в домашней системе.',
    },
    en: {
      primary: 'Take one of your command tokens off the board and gain 1 token, then rearrange the tokens on your command sheet.',
      secondary: 'Spend a strategy token, not placed on the board, to use PRODUCTION of one Space Dock in your home system.',
    },
  },
  te6warfare: {
    ru: {
      primary: 'Проведите тактическое действие в любой системе, не кладя жетон, даже если ваш жетон там уже есть. До и после него можно перераспределить жетоны.',
      secondary: 'Жетон из стратегического пула, который не кладётся на карту: используйте PRODUCTION своих юнитов в домашней системе.',
      change: "В Thunder's Edge основное действие даёт тактическое действие без жетона вместо снятия жетона с карты, а дополнительное работает для всех юнитов домашней системы, а не одного Space Dock.",
    },
    en: {
      primary: 'Take a tactical action in any system without placing a token, even where you already have one. You may rearrange your tokens before and after.',
      secondary: 'Spend a strategy token, not placed on the board, to use PRODUCTION of your units in your home system.',
      change: "In Thunder's Edge the primary gives a tactical action without a token instead of lifting a token off the board, and the secondary covers all home system units rather than one Space Dock.",
    },
  },
  pok7technology: {
    ru: {
      primary: 'Изучите 1 технологию. Затем можно изучить ещё одну за 6 ресурсов.',
      secondary: 'Жетон из стратегического пула и 4 ресурса: изучите 1 технологию.',
    },
    en: {
      primary: 'Research 1 technology, then you may pay 6 resources for another.',
      secondary: 'Spend a strategy token and 4 resources to research 1 technology.',
    },
  },
  pok8imperial: {
    ru: {
      primary: 'Сразу выполните публичную цель, если подходите под условия. Затем получите 1 очко, если контролируете Mecatol Rex, иначе возьмите секретную цель.',
      secondary: 'Жетон из стратегического пула: возьмите секретную цель.',
    },
    en: {
      primary: 'Score a public objective now if you meet it. Then gain 1 victory point if you control Mecatol Rex, otherwise draw a secret objective.',
      secondary: 'Spend a strategy token to draw a secret objective.',
    },
  },
};

export function cardSummary(key: string, lang: Lang): CardSummary {
  const summary = SUMMARIES[key];
  if (!summary) throw new Error(`No summary for strategy card "${key}"`);
  return summary[lang];
}
