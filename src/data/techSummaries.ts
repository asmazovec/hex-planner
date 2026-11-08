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

const SAME_INFANTRY_RETURN = (roll: number): Record<Lang, string> => ({
  ru: `Уничтоженная пехота при броске ${roll}+ ложится на эту карту и в начале вашего следующего хода возвращается на вашу планету в домашней системе.`,
  en: `A destroyed infantry that rolls ${roll}+ waits on this card, then comes back to a home planet of yours when your next turn starts.`,
});
const ASSIMILATOR = (token: string): Record<Lang, string> => ({
  ru: `Когда способность фракции даёт вам чужую технологию, можете вместо этого положить жетон ${token} на фракционную технологию того игрока: эта карта работает как она. На одну технологию двух жетонов не кладут.`,
  en: `When a faction ability would give you someone’s technology, you may put the ${token} token on one of their faction technologies instead; this card then works as that one. One token per technology.`,
});

// Faction technologies. A unit upgrade tells only its ability: its numbers are in the ship table.
const FACTION_SUMMARIES: Record<string, Record<Lang, string>> = {
  // Base game
  bio: {
    ru: 'В конце фазы статуса можете снять сколько угодно пехоты со своих планет и расставить её на свои планеты в той же или соседних системах.',
    en: 'As the status phase ends, shift any of your infantry between your planets in one system or next-door systems.',
  },
  lw2: SAME_INFANTRY_RETURN(6),
  ds: {
    ru: 'В начале космического боя в системе с червоточиной и вашими кораблями можете нанести 1 попадание кораблю соперника.',
    en: 'When space combat opens where there is a wormhole and your ships, you may score 1 hit on an enemy ship.',
  },
  wg: {
    ru: 'Действие: истощите, чтобы поставить или перенести жетон червоточины Creuss в систему с вашей планетой или в не домашнюю систему без чужих кораблей.',
    en: 'Action: exhaust to put down or shift a Creuss wormhole token to a system with your planet, or to a non-home system free of enemy ships.',
  },
  qdn: {
    ru: 'В конце фазы стратегии можно потратить жетон приказа из стратегического резерва и отдать игроку 3 товара, чтобы обменяться с ним картой стратегии.',
    en: 'As the strategy phase ends, pay 1 strategy-pool token and hand a player 3 trade goods to swap one strategy card with them.',
  },
  pm: {
    ru: 'Действие: истощите и потратьте жетон приказа из стратегического резерва: вы получаете 4 товара, а выбранный вами другой игрок 2.',
    en: 'Action: exhaust and pay 1 strategy-pool token to take 4 trade goods; another player you pick takes 2.',
  },
  ers: {
    ru: 'Когда другой игрок активирует систему с вашими кораблями, получите 4 товара.',
    en: 'Take 4 trade goods whenever another player activates a system holding your ships.',
  },
  scc: {
    ru: 'Активировав систему со своими юнитами, можете истощить карту: на эту активацию система смежна со всеми системами, где есть ваши юниты.',
    en: 'After activating a system with your units, exhaust to make it adjacent, for this activation, to every system holding your units.',
  },
  is: {
    ru: 'При изучении технологии можете истощить карту и заплатить 2 ресурса, чтобы обойти все её требования.',
    en: 'When researching, exhaust and pay 2 resources to ignore every prerequisite of that technology.',
  },
  sdn2: {
    ru: 'Карта действия Direct Hit не может его уничтожить.',
    en: 'Direct Hit action cards cannot destroy it.',
  },
  l4: {
    ru: 'При вашем вторжении никто не может стрелять космическими пушками по вашим юнитам.',
    en: 'While you invade, nobody may fire space cannons at your units.',
  },
  nes: {
    ru: 'Устойчивость ваших юнитов отменяет 2 попадания вместо 1.',
    en: 'Your units’ Sustain Damage cancels 2 hits rather than 1.',
  },
  mc: {
    ru: 'Каждый потраченный товар стоит 2 ресурса или 2 влияния, а не 1.',
    en: 'Every trade good you spend counts as 2 resources or 2 influence instead of 1.',
  },
  so: {
    ru: 'После любого исхода космического боя получите 1 товар; победив, можете ещё произвести в этой системе 1 корабль того типа, что был уничтожен в бою.',
    en: 'After any space combat, won or lost, take 1 trade good; as the winner you may also build there 1 ship of a type destroyed in that fight.',
  },
  pws2: {
    ru: 'В его системе чужие юниты теряют Планетарный щит.',
    en: 'Enemy units in its system have no Planetary Shield.',
  },
  mr: {
    ru: 'Ваши корабли могут входить в сверхновые. Сверхновая с вашими юнитами получает Производство 5, как ваш юнит.',
    en: 'Your ships may enter supernovas. A supernova holding your units has Production 5, as if it were your unit.',
  },
  ng: {
    ru: 'Другой игрок, активировавший систему с вашими кораблями, возвращает жетон приказа из резерва флота в снабжение.',
    en: 'Anyone else who activates a system with your ships returns a fleet pool token to reinforcements.',
  },
  hcf2: {
    ru: 'Летает без транспортировки. Истребители сверх мест на борту ваших кораблей занимают в резерве флота по половине места.',
    en: 'Flies on its own. Fighters beyond your ships’ capacity take only half a fleet pool slot each.',
  },
  vax: ASSIMILATOR('X'),
  vay: ASSIMILATOR('Y'),
  ffac2: {
    ru: 'База с Производством 7 стоит в космосе, летает и отступает как корабль. Если её блокировали, она уничтожена.',
    en: 'A dock with Production 7 that sits in space, moves and retreats like a ship, and is destroyed when blockaded.',
  },
  cm: {
    ru: 'Соперники не активируют поля астероидов с вашими кораблями. В начале своего хода в фазе действий можете произвести 1 юнит в системе, где ваш юнит имеет Производство.',
    en: 'Others may not activate asteroid fields where you have ships. When your action-phase turn begins, build 1 unit where a unit of yours has Production.',
  },
  exo2: {
    ru: 'Direct Hit его не уничтожает. После раунда космического боя можете пожертвовать им, чтобы уничтожить до 2 кораблей в этой системе.',
    en: 'Immune to Direct Hit. After a space combat round you may sacrifice it to kill as many as 2 ships in its system.',
  },
  vpw: {
    ru: 'Если в раунде наземного боя соперник нанёс хотя бы 1 попадание, вы наносите ещё 1.',
    en: 'In a ground combat round where your opponent scores any hits, you score 1 more.',
  },
  so2: SAME_INFANTRY_RETURN(5),
  ac2: {
    ru: 'Улучшенный транспортник Sol: только числа, особого свойства нет.',
    en: 'Sol’s upgraded carrier: numbers only, no special ability.',
  },
  lgf: {
    ru: 'Пока вы не контролируете Mecatol Rex, в ваших тактических действиях в его системе есть червоточины α и β. Если контролируете: действие, истощите, чтобы поставить туда 1 пехоту из снабжения.',
    en: 'Without Mecatol Rex, your tactical actions treat its system as holding α and β wormholes. With it: action, exhaust to put 1 infantry from reinforcements there.',
  },
  htp: {
    ru: 'Когда ваши юниты применяют Производство, можете истощить карту и на это производство поменять местами ресурсы и влияние одной своей планеты.',
    en: 'When your units use Production, exhaust to swap the resources and influence of one planet of yours for that build.',
  },
  it: {
    ru: 'Когда другой игрок играет карту действия, можете истощить карту и потратить жетон приказа из стратегического резерва, чтобы её отменить.',
    en: 'When an opponent plays an action card, exhaust this and pay 1 strategy-pool token to cancel it.',
  },
  nf: {
    ru: 'Когда другой игрок активирует систему с вашими кораблями, можете истощить карту и потратить жетон приказа из стратегического резерва: его ход сразу кончается.',
    en: 'When someone else activates a system with your ships, exhaust and pay 1 strategy-pool token to end their turn on the spot.',
  },
  yso: {
    ru: 'Произведя юниты, поставьте до 2 пехоты из снабжения на свою планету или в космос рядом со своими кораблями.',
    en: 'After a build, put up to 2 infantry from reinforcements on a planet of yours or in space beside your ships.',
  },
  ic: {
    ru: 'В начале космического боя можете уничтожить свой крейсер или эсминец в активной системе: соперник получает 1 попадание и по возможности назначает его не на истребитель.',
    en: 'As space combat opens, destroy a cruiser or destroyer of yours there to score 1 hit, which the opponent puts on a non-fighter ship if possible.',
  },
  tp: {
    ru: 'В ваш ход фазы действий спасовавшие игроки не играют карты действий.',
    en: 'On your action-phase turns, players who already passed may not play action cards.',
  },
  mi: {
    ru: 'Действие: истощите, чтобы посмотреть карты действий другого игрока и забрать одну себе.',
    en: 'Action: exhaust to look through another player’s action cards and take one of them.',
  },
  // Prophecy of Kings and Codex
  ah: {
    ru: 'Соперники не проводят корабли через системы с вашими сооружениями. Планета с вашим сооружением получает Производство 1, как юнит.',
    en: 'Others cannot fly through systems with your structures. A planet holding one of your structures gets Production 1, like a unit.',
  },
  swa2: {
    ru: 'При заградительном огне за каждый результат 9 или 10 ещё уничтожается 1 пехота соперника в космосе активной системы.',
    en: 'Its barrage also kills 1 enemy infantry in the active system’s space for every 9 or 10 rolled.',
  },
  dt2: {
    ru: 'База с Производством 7. Её система считается гравитационным разломом, но ваши корабли за него не бросают. До 12 истребителей здесь не занимают места на борту.',
    en: 'A dock with Production 7. Its system works as a gravity rift that your ships never roll for; up to 12 fighters here need no capacity.',
  },
  vtx: {
    ru: 'Действие: истощите, выберите юнит другого игрока, не сооружение, в системе рядом с вашей базой и захватите 1 юнит этого типа из его снабжения.',
    en: 'Action: exhaust, pick a non-structure unit of another player next to one of your docks, and capture one of that type from their reinforcements.',
  },
  vw: {
    ru: 'Игрок, переместивший корабли в систему с вашими юнитами, отдаёт вам 1 promissory note с руки, если может.',
    en: 'A player who moves ships into a system with your units must hand you 1 promissory note, if they have one.',
  },
  as: {
    ru: 'Когда вы или ваш сосед активирует систему рядом с аномалией, можете дать всем его кораблям +1 к значению полёта в этом тактическом действии.',
    en: 'When you or a neighbour activates a system next to an anomaly, you may give every ship of that player +1 move for this tactical action.',
  },
  cl2: {
    ru: 'Уничтоженная пехота даёт 1 Продукцию или переводит 1 Продукцию в товар, затем ложится на эту карту и в начале вашего следующего хода возвращается на вашу планету в домашней системе.',
    en: 'A destroyed infantry gives 1 commodity or turns 1 commodity into a trade good, then waits on this card and returns home when your following turn begins.',
  },
  gr: {
    ru: 'Перед голосованием игрока можете истощить карту: он отдаёт хотя бы 1 голос за выбранный вами исход или возвращает жетон приказа из резерва флота в снабжение.',
    en: 'Before a player votes, exhaust: they put at least 1 vote on the outcome you name, or return a fleet pool token to reinforcements.',
  },
  m2: {
    ru: 'Можно считать его соседним с системами, где есть хотя бы 1 ваш мех.',
    en: 'May count as adjacent to any system holding at least 1 of your mechs.',
  },
  tcs: {
    ru: 'Когда агент любого игрока истощается, можете истощить карту и подготовить его; если это чужой агент, можете заключить с тем игроком сделку.',
    en: 'When any agent is exhausted, exhaust this to ready it; readying someone else’s agent lets you trade with that player.',
  },
  pfa: {
    ru: 'После исследования планеты подготовьте её.',
    en: 'Once you explore a planet, ready it.',
  },
  sc: {
    ru: 'В начале раунда боя можете истощить карту: в этом раунде все ваши броски боя получают +1.',
    en: 'As a combat round begins, exhaust to add +1 to every combat roll of yours this round.',
  },
  ht2: {
    ru: 'ПСО, который одновременно наземные войска, и его нельзя перевозить. Космическая пушка бьёт и по кораблям в соседних системах.',
    en: 'A PDS that also counts as a ground force and cannot be transported. Its space cannon reaches ships in adjacent systems too.',
  },
  se2: {
    ru: 'Улучшенный крейсер Titans: только числа, особого свойства нет.',
    en: 'Titans’ upgraded cruiser: numbers only, no special ability.',
  },
  iihq: {
    ru: 'Вы соседи всех, у кого есть юниты или планеты в системе Mecatol Rex или рядом с ней. Вы навсегда получаете Custodia Vigilia с её легендарной способностью.',
    en: 'You neighbour everyone with units or planets in or next to the Mecatol Rex system. You gain Custodia Vigilia and its legendary ability for good.',
  },
  asn: {
    ru: 'Раз за действие, применяя Производство юнита, можете применить Производство ещё одного своего юнита в любой системе.',
    en: 'Once per action, using one unit’s Production lets you also use another unit’s Production anywhere.',
  },
  // Thunder's Edge
  executiveorder: {
    ru: 'Действие: истощите, возьмите верхнюю или нижнюю карту колоды повесток, и по ней сразу голосуют, как будто спикер вы. Товары и ресурсы можно тратить как голоса.',
    en: 'Action: exhaust to draw the top or bottom agenda and hold an immediate vote with you as speaker; trade goods and resources count as votes.',
  },
  proxima: {
    ru: 'Каждый ваш заряженный (galvanized) юнит отменяет 1 попадание бомбардировки по вашим наземным войскам. В начале раунда наземного боя можете бомбардировать соперника 3 кубиками на 8, но тот же бросок делается и по вам.',
    en: 'Each galvanized unit of yours cancels 1 bombardment hit on your ground forces. As a ground combat round starts, you may bombard the enemy with 3 dice at 8, and roll the same against yourself.',
  },
  helios2: {
    ru: 'Производство базы равно ресурсам планеты плюс 4, а сама планета даёт на 2 ресурса больше. До 3 истребителей здесь не занимают места на борту.',
    en: 'The dock produces its planet’s resources plus 4, the planet gains 2 resources, and up to 3 fighters here need no capacity.',
  },
  hydrothermal: {
    ru: 'В начале фазы статуса получите 1 товар за каждую карту океана в игре.',
    en: 'When the status phase starts, take 1 trade good per ocean card in play.',
  },
  radical: {
    ru: 'В начале фазы статуса можете заменить свою технологию, не улучшение юнита, на технологию того же цвета ровно с одним требованием больше.',
    en: 'When the status phase starts, you may trade a non-unit-upgrade technology for one of its colour needing exactly one more prerequisite.',
  },
  'planesplitter-firm': {
    ru: 'Получив карту, введите в игру The Fracture. Если в игре Obsidian, переверните её.',
    en: 'Gaining it puts The Fracture into play. Flip it over when Obsidian is in the game.',
  },
  'parasite-firm': {
    ru: 'В начале фазы статуса можете поставить 1 пехоту из снабжения на свою планету в домашней системе. Если в игре Obsidian, переверните карту.',
    en: 'When the status phase starts, you may put 1 infantry from reinforcements on a home planet of yours. Flip it over when Obsidian is in the game.',
  },
  'planesplitter-obs': {
    ru: 'Выполняя стратегическое действие, можете перенести жетон ingress в систему с вашими юнитами или рядом с ними. Изучить нельзя.',
    en: 'During a strategic action of yours, you can shift an ingress token to a system with or next to your units. Cannot be researched.',
  },
  'parasite-obs': {
    ru: 'В начале своего хода уничтожьте 1 чужую пехоту в системе с вашей пехотой или рядом с ней. Изучить нельзя.',
    en: 'As your turn begins, destroy 1 enemy infantry in or next to a system with your infantry. Cannot be researched.',
  },
  subatomic: {
    ru: 'Когда ваш корабль уничтожен, можете произвести корабль того же типа у базы в домашней системе.',
    en: 'When a ship of yours dies, you may build one of that type at a dock in your home system.',
  },
  exile2: {
    ru: 'В конце любого боя в его системе или не дальше 2 систем от него можете поставить туда разлом (breach), активный или нет.',
    en: 'After any combat in its system or within 2 systems of it, you may put an active or inactive breach there.',
  },
  nanomachines: {
    ru: 'Действие: истощите, чтобы на выбор поставить 1 ПСО на свою планету, починить все свои повреждённые юниты или сбросить карту действия и взять новую.',
    en: 'Action: exhaust for one of three: put 1 PDS on a planet of yours, repair all your damaged units, or discard an action card to draw one.',
  },
  linkship2: {
    ru: 'Может применять космическую пушку одного из ваших сооружений в своём космосе; несколько таких кораблей могут пользоваться одним сооружением.',
    en: 'Can fire the space cannon of a structure of yours in its space; several linkships may use the same structure.',
  },
};

/** Own short retelling of a technology, faction technologies included, or null if there is none. */
export const techSummary = (id: string, language: Lang): string | null => (SUMMARIES[id] ?? FACTION_SUMMARIES[id])?.[language] ?? null;
