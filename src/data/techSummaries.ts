type Lang = 'ru' | 'en';

// Own short retellings for the player's memory, not card text. The card itself decides in play.
const SUMMARIES: Record<string, Record<Lang, string>> = {
  aida: {
    ru: 'Истощите, чтобы при изучении улучшения юнита обойти одно требование или удешевить постройку на число ваших улучшений.',
    en: 'Exhaust to skip one prerequisite of a unit upgrade, or to cut a build by the number of unit upgrades you own.',
  },
  amd: {
    ru: 'Корабли летают через поля астероидов. Космические пушки стреляют по вашим юнитам с −1.',
    en: 'Ships may fly through asteroid fields. Space cannons fire at your units at −1.',
  },
  bs: {
    ru: 'В конце своего хода истощите, чтобы подготовить планету со специализацией или другую свою технологию.',
    en: 'At the end of your turn, exhaust to ready a planet with a specialty or another of your technologies.',
  },
  det: {
    ru: 'После тактического действия у жетона фронтира с вашими кораблями исследуйте его. Отступать можно в соседнюю систему без чужих юнитов.',
    en: 'After a tactical action at a frontier token where you have ships, explore it. You may retreat to any adjacent system free of other players’ units.',
  },
  dxa: {
    ru: 'Выиграли наземный бой: можете добавить на эту планету 1 пехоту из запаса.',
    en: 'Win a ground combat and you may add 1 infantry from reinforcements to that planet.',
  },
  gd: {
    ru: 'После активации системы один ваш корабль получает +1 к движению на это действие.',
    en: 'Once you activate a system, one of your ships moves 1 further during this action.',
  },
  gls: {
    ru: 'Истощите перед выстрелом космических пушек: их попадания придётся распределять на корабли, кроме истребителей, если это возможно.',
    en: 'Exhaust before space cannons fire: their hits must go on ships other than fighters where possible.',
  },
  md: {
    ru: 'При активации системы с вашими сооружениями ставьте к каждому по 1 пехоте. В начале наземного боя у своего сооружения наносите 1 попадание.',
    en: 'When a system with your structures is activated, add 1 infantry to each. Ground combat at your structures opens with 1 hit from you.',
  },
  nm: {
    ru: 'В фазе статуса вы берёте на одну карту действий больше: две вместо одной.',
    en: 'In the status phase you take one extra action card: two rather than one.',
  },
  pa: {
    ru: 'Специализации планет работают без истощения, даже на истощённых планетах. В фазе действий такие планеты можно истощать ради 1 товара за каждую.',
    en: 'Planet specialties work without exhausting, even on exhausted planets. In the action phase, exhaust such planets for 1 trade good each.',
  },
  pi: {
    ru: 'В конце хода истощите, чтобы перераспределить жетоны команд. В голосовании можно добавить 3 голоса; проиграв, истощите карту.',
    en: 'At the end of your turn, exhaust to rearrange command tokens. You may add 3 votes; if your outcome loses, exhaust this card.',
  },
  ps: {
    ru: 'При бомбардировке или выстреле космических пушек один ваш юнит бросает на кубик больше.',
    en: 'In a bombardment or space cannon shot, one of your units rolls one more die.',
  },
  sar: {
    ru: 'После постройки истощите, чтобы поставить меха на свою планету в этой системе. За каждого потерянного меха получаете 1 товар.',
    en: 'After a build, exhaust to put a mech on a planet of yours in that system. Each mech you lose pays 1 trade good.',
  },
  sdn: {
    ru: 'При активации системы можете исследовать в ней одну планету, где есть ваши юниты.',
    en: 'On activating a system, you may explore one planet there that holds your units.',
  },
  sr: {
    ru: 'Действие: истощите, чтобы построить 1 корабль в системе со своим космодоком.',
    en: 'Action: exhaust to build 1 ship in a system with a space dock of yours.',
  },
  st: {
    ru: 'Каждая постройка обходится на 1 ресурс дешевле.',
    en: 'Each build costs you 1 resource less.',
  },
};

/** Own short retelling of a technology, or null if there is none. */
export const techSummary = (id: string, language: Lang): string | null => SUMMARIES[id]?.[language] ?? null;
