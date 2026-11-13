# Модель игры: одно ядро, один язык

Дата: 2026-11-13. Заменяет устройство `src/domain` (повтор записей по состоянию одного игрока) единым ядром `src/game`.

## Зачем

Сейчас логика размазана, и одна и та же вещь отвечается в нескольких местах по-разному:

- Игрока как сущности нет. «Я» — поля партии (`game.faction`, `planetControl: 'me'`), соперники — отдельный список, их юниты в `enemyUnits`. Состояние (`GameState`) — состояние одного игрока, внутри которого лежат общие для стола вещи («on my state only»: законы, цели, вложения) и состояния соперников (`rivals`).
- Подготовка к игре разобрана на куски: юниты в `startUnits`, базу ставило отдельное правило, ПСО не ставил никто.
- Действие не имеет строения. Действие Warfare — отдельная запись, привязанная к карте по `fromCard`; что оно «часть карты», по отдельности выводили расчёт, нумерация и стрелки.
- Запись плана — то, что ввёл интерфейс (`moves`, `landings`, `effects.boughtTokens`), а не высказывание на языке игры. Чего в записи нет, уходит в ручную правку.
- Компоненты висят на крючках, добавленных под конкретные карты (`modify`, `play`, `gained`, `onStatusStart`, `onActivate`…), с контекстом `game/state/shared`, в котором «чьё это» каждый эффект выясняет сам.
- Интерфейс местами считает сам (цена, значение планеты, статус, номер действия).

## Принципы

1. **Одно состояние стола.** `Board` симметричен: все игроки равны, «я» — только выбор точки зрения в интерфейсе.
2. **Состояние меняют только события.** `apply(board, event) → board`. Ничего другого состояние не пишет.
3. **Партия описывается действиями.** План — это список действий игроков на языке игры; действие имеет шаги и может содержать вложенное действие.
4. **Правила — это разбор действия.** `resolve(board, action) → { events, violations }`. Нарушение ничего не запрещает (как сейчас).
5. **Компонент — обработчик.** Он подписан на событие или точку расчёта, знает держателя, и говорит одно из четырёх: изменить число, добавить события, снять нарушение, подсказать.
6. **Спрашивают все одно и то же.** Любое число на экране — запрос к ядру (`queries`). Интерфейс ничего не считает и состояние не читает в обход запросов.

## Словарь (типы ядра)

```ts
type PlayerId = string;            // 'p1'…'p8' по месту; стабилен на всю партию
type Slot = string;                // 'q,r' или id дома вне карты
type PlanetId = string;
type ComponentId = string;         // '<вид>:<id>' как сейчас

interface Table {                  // то, что не меняется за партию
  id: string; name: string; expansions: ExpansionId[]; layout: MapLayout;
  map: Record<Slot, TileRef>;
  players: Player[];               // в порядке мест
  viewer: PlayerId;                // чьими глазами смотрит интерфейс
}
interface Player { id: PlayerId; faction: string; seat: number; color: number; setup: SetupChoices }

interface Board {
  round: number; phase: Phase; speaker: PlayerId;
  players: Record<PlayerId, PlayerState>;
  systems: Record<Slot, SystemState>;
  planets: Record<PlanetId, PlanetState>;
  common: CommonState;             // законы, открытые цели, жетон хранителей, экспедиция, Излом, жетоны червоточин
}
interface PlayerState {
  pools: { tactic: number; fleet: number; strategy: number };
  tradeGoods: number; commodities: number; vp: number;
  cards: Record<ComponentId, CardState>;   // всё, что он держит: технологии, карты, лидеры, обязательства
  strategy: { card: number; played: boolean }[];
  passed: boolean;
}
interface SystemState { ships: Record<PlayerId, UnitCounts>; tokens: PlayerId[]; afloat: Record<PlayerId, StructureCounts> }
interface PlanetState { owner?: PlayerId; exhausted: boolean; ground: Record<PlayerId, UnitCounts>;
  structures: StructureCounts; attached: ComponentId[] }
type CardState = 'ready' | 'exhausted' | 'locked' | 'purged' | 'inPlay';
```

### События — единственный способ изменить стол

Малый закрытый набор, каждый — факт на языке игры:

`RoundStarted`, `PhaseStarted`, `TurnStarted`, `TurnEnded`,
`SystemActivated`, `UnitsMoved`, `UnitsPlaced`, `UnitsRemoved` (с причиной: бой, предел флота, цена),
`StructurePlaced`, `StructureRemoved`, `StructureMoved`,
`PlanetGained`, `PlanetExhausted`, `PlanetReadied`, `CardAttached`,
`TokensGained`, `TokensSpent`, `TokensMoved` (между резервами), `TokenReturned`,
`TradeGoodsChanged`, `CommoditiesChanged`, `GoodsTransferred` (сделка),
`CardGained`, `CardLost`, `CardExhausted`, `CardReadied`, `CardPurged`, `CardPlayed`,
`TechnologyResearched`, `ObjectiveRevealed`, `ObjectiveScored`, `PointsChanged`,
`LawEnacted`, `LawDiscarded`, `SpeakerChanged`, `StrategyCardPicked`, `StrategyCardPlayed`,
`CustodiansRemoved`, `ExpeditionSliceTaken`, `FractureOpened`, `Passed`.

Каждое событие несёт `player`, `cause` (действие и шаг, из которых оно вышло, и компонент, если его породил компонент) — журнал партии читается как текст и объясняет любое число.

### Действия — язык плана

```ts
type Action =
  | Setup                      // подготовка: из листа фракции и выборов игрока
  | StrategyPick               // фаза стратегии
  | Tactical                   // активация → движение → космический бой → вторжение → производство
  | Strategic                  // основная способность карты; может содержать вложенные действия
  | Secondary                  // второстепенная способность, в ходе другого игрока
  | ComponentPlay              // действие компонента
  | Pass
  | StatusPhase                // подсчёт целей, жетоны, карты
  | Agenda                     // карта политики и её исход
  | Correction;                // ручная правка: набор событий с подписью, когда правило не смоделировано

interface Turn {               // ход игрока в фазе действий
  player: PlayerId; status: 'planned' | 'done' | 'cancelled';
  action: Tactical | Strategic | ComponentPlay | Pass;
  acts: (Transaction | Expedition)[];     // сделки и экспедиция в этом ходу
  used: ComponentUse[];                   // что применено помимо действия, с выборами
}
interface Tactical { kind: 'tactical'; system: Slot; free?: boolean;
  movement: Flight[]; spaceCombat?: Losses; invasion: Landing[]; groundCombat?: GroundLosses;
  production?: Build; fleetRemovals?: UnitCounts }
interface Strategic { kind: 'strategic'; card: number; primary: CardInput; nested?: Action[] }
```

Вложенность заменяет ссылки: тактическое действие Warfare лежит в `Strategic.nested`, у него нет своего статуса и своего места в списке — и вопроса «чей статус» не возникает. Потери обеих сторон боя — часть `spaceCombat`/`groundCombat` действия. Исход, который приложение не считает (бой, шрам, эффект несмоделированной карты), записывается как `Correction` — те же события, а не особый тип «правки с числами».

### Разбор действия

```ts
resolve(table, board, turn, rules): Resolution
interface Resolution { steps: StepResult[] }             // по шагам, в порядке правил
interface StepResult { step: RuleStep; events: Event[]; violations: Violation[]; hints: Hint[] }
```

Шаг — единица, в которой проверяется правило и рождаются события. Шаги и их порядок заданы для каждого вида действия один раз (сейчас это модули `replay/*`); редактор показывает блоки по тем же шагам — предупреждение стоит в блоке своего шага по построению, без таблиц соответствия.

### Компоненты

```ts
interface Ability {
  id: ComponentId; rule: string;                         // цитата карты, на которой держится
  holder: 'self' | 'others' | 'anyone';                  // на чьё действие откликается
  when?: Trigger;                                        // событие или шаг
  modify?: { point: Point; by(ctx): number };            // изменить число в точке расчёта
  react?(ctx): Event[];                                  // добавить события
  permit?: { code: ViolationCode; when?(ctx): boolean }; // снять нарушение (остаётся в списке как разрешённое)
  hint?: { step: RuleStep };                             // только напомнить
  choose?: ChoiceSpec[]; cost?: Cost;
}
```

`ctx` даёт `board`, `holder: PlayerId`, `actor: PlayerId`, действие и шаг. «Чьё это» и «кому показывать» решает ядро по `holder`, а не каждый файл компонента. Точки расчёта (`Point`) — закрытый список: значение планеты, цена, значение полёта, вместимость, предел флота, производство, предел руки, жетоны за статус и т. д.

### Запросы

`src/game/queries.ts` — единственное, что читает интерфейс: `planetValue`, `costOf`, `capacityOf`, `fleetLimit`, `reach`, `ready`, `turnNumber`, `statusOf`, `holdings`, `structuresOf`, `hintsAt`, `violationsOf`… Контрактный тест запрещает `src/ui` импортировать что-либо из `src/game` кроме `api.ts` (действия, запросы, типы).

### Подготовка

`setup(table, pack) → Event[]`: из листа фракции целиком (корабли, войска, здания с планетами, технологии, продукция, лидеры, обязательства) и выборов игрока (`SetupChoices`: стартовая технология, планета базы). Один путь для всех игроков. Контракт: стол после подготовки равен листам.

### Время

`timeline(table, plan) → Frame[]`: свёртка `resolve` + `apply` по ходам в порядке плана. «Сейчас» — только выполненные ходы, «прогноз» — выполненные и запланированные; статус один на ход. Пересчёт с изменённого раунда, как сейчас.

## Сохранение

Формат `ti4-planner/3`: `Table` + планы из `Turn`. Сохранение `ti4-planner/2` читается и переводится при открытии (`upgrade2to3`): «я» и соперники становятся игроками по местам, записи — ходами, `fromCard` — вложением, ручные правки — `Correction`. Исходный файл не трогается.

## Переход (приложение рабочее на каждом шаге)

1. **Ядро.** `src/game`: типы, события и `apply`, подготовка, запросы к столу. Тесты инвариантов. Старый код не затронут.
2. **Разбор действий.** Перенос модулей `replay/*` в шаги `resolve` по одному виду действия: тактическое, карты стратегии, компонент, статус, политика. Тесты правил `src/domain/rules/lrr` идут через `kit.ts` — у набора меняется реализация на ядро, сами тесты остаются. Старый и новый расчёт сверяются на одних планах, пока идёт перенос.
3. **Компоненты.** Адаптер: нынешний `ComponentEffect` исполняется поверх ядра (вид стола глазами держателя); затем файлы компонентов переводятся на `Ability` партиями, с контрактным тестом.
4. **Интерфейс.** `timelineOf` отдаёт кадры ядра; редакторы пишут `Turn`; экраны читают только запросы. Собственные расчёты интерфейса удаляются по списку (цена, значение планеты, статус, номер).
5. **Удаление.** `src/domain/replay`, `GameState`, `enemyUnits`/`planetControl`, `fromCard` и адаптер уходят. CLAUDE.md переписывается под новое устройство.

Каждый шаг заканчивается зелёными проверками и публикацией.

## Что не меняется

Данные пакетов и тексты, каталог компонентов и их id, реестр кодов нарушений и пунктов LRR, визуальный язык и экраны, требование лёгкости: без симуляции боя, предупреждения ничего не запрещают.
