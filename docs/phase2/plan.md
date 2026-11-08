# План Фазы 2

Собрано скриптом `npm run plan:todos` из комментариев `TODO(P2-…)` в коде. Не правьте этот файл руками: правьте TODO и запустите скрипт снова.

Всего: **167** TODO в **44** файлах, **25** потоков.

## По типам

| Тип | Значение | Количество |
|---|---|---|
| `bug` | Ошибка: код делает то, что правило запрещает | 1 |
| `check` | Нет проверки: правило запрещает, нарушения нет | 1 |
| `model` | Нет модели: не хватает данных или понятия | 1 |
| `arch` | Архитектура: ответственность не на месте | 42 |
| `dup` | Дублирование | 59 |
| `dead` | Мёртвый код | 2 |
| `ui` | Визуальный язык: элемент вне общего контейнера | 56 |
| `vocab` | Термины игры | 2 |
| `doc` | Документация | 3 |

## Волны

Поток стоит на волну позже самого позднего из тех, на чей результат он опирается. Потоки одной волны независимы: их можно делать параллельно, у каждого свои файлы.

**Волна 0:** [rule-engine](#ws-rule-engine) (0), [domain-purity](#ws-domain-purity) (0), [data](#ws-data) (0), [ui-structure](#ws-ui-structure) (0), [ui-css](#ws-ui-css) (7), [vocab](#ws-vocab) (2), [docs](#ws-docs) (2)

**Волна 1:** [replay-steps](#ws-replay-steps) (0), [ui-logic-to-domain](#ws-ui-logic-to-domain) (36), [ui-warnings](#ws-ui-warnings) (1), [ui-containers](#ws-ui-containers) (89)

**Волна 2:** [command-tokens](#ws-command-tokens) (0), [movement](#ws-movement) (1), [transport](#ws-transport) (0), [combat-order](#ws-combat-order) (0), [invasion](#ws-invasion) (0), [structures](#ws-structures) (0), [production](#ws-production) (0), [payment](#ws-payment) (1), [strategy-cards](#ws-strategy-cards) (0), [round-flow](#ws-round-flow) (0), [thunders-edge](#ws-thunders-edge) (0), [ui-nesting](#ws-ui-nesting) (12), [ui-plan-screen](#ws-ui-plan-screen) (15)

**Волна 3:** [rivals](#ws-rivals) (1)

## Потоки

<a id="ws-rule-engine"></a>
### Нарушения правил как отдельный канал · `rule-engine` · волна 0

**Цель.** Тип нарушения с номером правила, шагом действия и местом возникновения; реестр проверок по шагам; контрактные тесты: у каждого правила есть тест, у каждого шага есть место показа, UI не создаёт нарушений.

**Файлы потока:** `src/domain/types.ts (Warning)`, `src/domain/rules/registry.ts (new)`, `src/domain/rules/contract.test.ts (new)`

_Нет TODO._

<a id="ws-domain-purity"></a>
### Чистота домена · `domain-purity` · волна 0

**Цель.** Домен без случайностей и часов, без геометрии отрисовки, без импорта из UI и без цикла с data.

**Файлы потока:** `src/domain/newGame.ts`, `src/domain/route.ts`, `src/domain/cards.ts`, `src/domain/mapString.test.ts`

_Нет TODO._

<a id="ws-data"></a>
### Игровые данные · `data` · волна 0

**Цель.** В пакетах есть то, что требуют правила: состав набора (96.2), Production базы, уровни Infantry II, War Sun, PDS II, Space Dock II, выходы Излома; с указанием источника.

**Файлы потока:** `scripts/build-data.ts`, `src/data/packs/*.json`, `src/data/provenance.json`

_Нет TODO._

<a id="ws-ui-structure"></a>
### Каталоги UI · `ui-structure` · волна 0

**Цель.** Однородные элементы в тематических каталогах (primitives, feedback, overlays, drawers, plan/editors, plan/blocks); общие примитивы не в фичевых папках.

**Файлы потока:** `src/ui/** (moves only)`

_Нет TODO._

<a id="ws-ui-css"></a>
### Тема · `ui-css` · волна 0

**Цель.** Цвета только переменными, без дублей селекторов и мёртвых правил; общие утилиты.

**Файлы потока:** `src/ui/theme.css`

**Нужно ваше решение или прототип:** P2-503 (decision, prototype)

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-469 | dup |  | [src/ui/units/sprites.ts:5](../../src/ui/units/sprites.ts#L5) | цвета игроков повторяют --player-1..8 из темы и могут разойтись: тест на совпадение с theme.css или чтение CSS-переменных перед выпечкой спрайтов | #player-colour | s |  |
| P2-552 | dup |  | [src/ui/theme.css:699](../../src/ui/theme.css#L699) | заголовок LayoutPicker собран своим правилом, а не общим заголовком раздела 959: перейти на общий — P2 note: the common heading draws lines on both sides, so moving the LayoutPicker title to it changes the page; it also needs the markup (P2-570, ui-containers) | #section-title | s | P2-570 |
| P2-254 | dead |  | [src/ui/map/builder/LayoutPicker.tsx:43](../../src/ui/map/builder/LayoutPicker.tsx#L43) | Берёт .panel, а CSS потом снимает с неё всё оформление: убрать класс panel и снимающие правила | #panel | s |  |
| P2-255 | dead |  | [src/ui/map/builder/TileNumberInput.tsx:47](../../src/ui/map/builder/TileNumberInput.tsx#L47) | Тот же .panel, с которого CSS снимает оформление: убрать | #panel | s | P2-254 |
| P2-245 | ui |  | [src/ui/drawers/MapLegend.tsx:44](../../src/ui/drawers/MapLegend.tsx#L44) | Цвет точки передаётся style background var(--…): модификатор класса legend-dot-<цвет> в теме | #inline-style #legend | s |  |
| P2-257 | ui |  | [src/ui/map/builder/TileNumberInput.tsx:63](../../src/ui/map/builder/TileNumberInput.tsx#L63) | Ряд подсказок на .row без общего класса, хотя есть .chips: перевести на .chips | #chips | s |  |
| P2-503 | ui |  | [src/ui/theme.css:171](../../src/ui/theme.css#L171) | три цвета «выбрано» для одной роли: голубой здесь, .chip 706, .slice 646, .card-main 462; золотой .option 457, .card-cell 450, .card-abilities 472, .pic-taken 616, .token-tile-on 540, .ship-row-live 838, .upgrade-card.on 857, .entry-upgrades 871, .hex-button:has(checked) 508; зелёный .hex-button[aria-pressed] 1009, .fac-option 1018, вкладки и шторки. Решить по прототипу, какой цвет у переключателей — P2 note: needs a decision and a page prototype, left as it is | #selected-state | m |  |

<a id="ws-vocab"></a>
### Термины игры · `vocab` · волна 0

**Цель.** npm run lint:terms без ошибок и предупреждений: термины Rules Reference и Hobby World, названия по-английски.

**Файлы потока:** `src/i18n/*.json`, `comments`

**Нужно ваше решение или прототип:** P2-060 (decision)

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-060 | vocab |  | [.vale/styles/TI4Ru/Terms.yml:4](../../.vale/styles/TI4Ru/Terms.yml#L4) | ru.json: «жетон команд», «космодок», «вторичное», «наземные юниты», «вместимость», «Мекатол Рекс» → термины Hobby World; решить, разрешить ли короткие формы («жетон тактики») здесь | #i18n | m |  |
| P2-061 | vocab |  | [.vale/styles/TI4/Terms.yml:2](../../.vale/styles/TI4/Terms.yml#L2) | en.json и комментарии кода: «ground units» → «ground forces» (25 мест), «strategy action» → «strategic action»; npm run lint:terms должен быть чистым | #i18n #comments | s |  |

<a id="ws-docs"></a>
### Документация · `docs` · волна 0

**Цель.** CLAUDE.md не противоречит правилам (разлом, forToken) и описывает новый канал нарушений.

**Файлы потока:** `CLAUDE.md`

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-063 | doc | 83.3 | [CLAUDE.md:68](../../CLAUDE.md#L68) | forToken сейчас не выводится, а хранится и устаревает (P2-034) | #for-token | s | ~~P2-034~~ ✓ |
| P2-064 | doc |  | [CLAUDE.md:66](../../CLAUDE.md#L66) | Описать канал нарушений: правило, шаг, место, реестр, контрактные тесты | #warning-channel | s |  |

<a id="ws-replay-steps"></a>
### Повтор плана по шагам правил · `replay-steps` · волна 1

**Цель.** replay разложен на фазы раунда и шаги тактического действия (89.1-89.5) и карт; каждый шаг: проверки над состоянием до шага, затем чистый эффект. Фаза статуса применяется в своей фазе.

**Опирается на:** `rule-engine`

**Файлы потока:** `src/domain/project.ts (replay, applyEntry, applyTactical)`

_Нет TODO._

<a id="ws-ui-logic-to-domain"></a>
### Логика из UI в домен · `ui-logic-to-domain` · волна 1

**Цель.** Правила, посчитанные в UI, живут в домене: tactical.ts, цели карт, доступные к подбору, перегруз, нет базы, перераспределение жетонов, стеки тайла.

**Опирается на:** `rule-engine`

**Файлы потока:** `src/ui/plan/tactical.ts → src/domain/tactical.ts`, `src/ui/screens/PlanScreen.tsx (highlight logic)`

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-204 | arch |  | [src/ui/map/stage/HexStage.tsx:122](../../src/ui/map/stage/HexStage.tsx#L122) | Правило «наземные по планетам, числящиеся за системой снимаются первыми» решает UI: перенести в действие стора или домен | #rivals #enemy-units | m |  |
| P2-205 | arch |  | [src/ui/map/stage/HexStage.tsx:152](../../src/ui/map/stage/HexStage.tsx#L152) | Сборка production/productionGround и автооплата (autoPay, если оплата не ручная) считаются в UI: функция домена рядом с withLoss, общая с редактором тактики | #production #payment #duplicate-of-domain | m |  |
| P2-209 | arch |  | [src/ui/map/stage/HexStage.tsx:206](../../src/ui/map/stage/HexStage.tsx#L206) | Есть ли строение в самой партии, а не в записях (game.pds, startingDocks), решает UI: нужна функция домена | #structures | s |  |
| P2-221 | arch |  | [src/ui/map/TileView.tsx:203](../../src/ui/map/TileView.tsx#L203) | Стеки тайла (мои, соперников по replay или по game.enemyUnits, наземные на первой планете, строения) собираются в UI: функция домена stacksOf | #duplicate-of-domain #rivals #stacks | m |  |
| P2-251 | arch |  | [src/ui/map/builder/LayoutPicker.tsx:8](../../src/ui/map/builder/LayoutPicker.tsx#L8) | Какие числа игроков выбирают раскладку и где гиперпути от Milty, решает UI: перенести в domain/mapBuilder.ts | #layout | s |  |
| P2-252 | arch |  | [src/ui/map/builder/LayoutPicker.tsx:39](../../src/ui/map/builder/LayoutPicker.tsx#L39) | Число мест с гиперпутями считается по шаблону в UI: функция в domain/mapBuilder.ts | #layout #hyperlanes | s | P2-251 |
| P2-301 | arch |  | [src/ui/plan/tactical.ts:9](../../src/ui/plan/tactical.ts#L9) | арифметика UnitCounts (hasUnits, withCount, addUnits, countOf) нужна и домену; перенести в src/domain вместе с остальной тактикой |  | s |  |
| P2-302 | arch |  | [src/ui/plan/tactical.ts:27](../../src/ui/plan/tactical.ts#L27) | правки записи (isUntouched, lossesOf, withLoss, withAdjustedUnit) — правила записи тактики и корректировки, не UI; в src/domain/tactical.ts |  | m | ~~P2-300~~ ✓ |
| P2-303 | arch |  | [src/ui/plan/tactical.ts:86](../../src/ui/plan/tactical.ts#L86) | sourcePools и fliesNow решают, откуда что берётся и кто летит сам (fliesNow повторяет fightersFly и ground домена); в src/domain/tactical.ts | #duplicate-of-domain | m |  |
| P2-304 | arch |  | [src/ui/plan/tactical.ts:105](../../src/ui/plan/tactical.ts#L105) | модель ходов тактики (sourcesOf, groupOf, viaOf, withRoute, withoutSource, withUnitCount, withoutEmptySources) живёт в UI, а project.ts группирует ходы тем же sourceSlot; в src/domain/tactical.ts |  | m |  |
| P2-305 | arch |  | [src/ui/plan/tactical.ts:154](../../src/ui/plan/tactical.ts#L154) | arrowsOf и entrySystems выводят из записи стрелки и системы для камеры: чистые функции записи, в src/domain/tactical.ts |  | s |  |
| P2-306 | arch |  | [src/ui/plan/tactical.ts:240](../../src/ui/plan/tactical.ts#L240) | flies и stateInFlight повторяют снятие юнитов и выставление жетона из applyTactical (project.ts); состояние в полёте должен давать домен шагом replay | #duplicate-of-domain | m |  |
| P2-312 | arch |  | [src/ui/plan/editors/TacticalEditor.tsx:66](../../src/ui/plan/editors/TacticalEditor.tsx#L66) | наземные юниты заданы списком; брать pack.units[u].ground |  | s |  |
| P2-313 | arch |  | [src/ui/plan/editors/TacticalEditor.tsx:68](../../src/ui/plan/editors/TacticalEditor.tsx#L68) | что прилетело, что осталось после боя и что можно высадить считает UI; это шаг replay (после перелёта и потерь, до высадки), брать состояние после боя из домена | #duplicate-of-domain | m | P2-312 |
| P2-321 | arch |  | [src/ui/plan/editors/UnitPicker.tsx:67](../../src/ui/plan/editors/UnitPicker.tsx#L67) | «доступно за вычетом других маршрутов» считает UI; в домен рядом с groupOf | #duplicate-of-domain | m | P2-304 |
| P2-359 | arch |  | [src/ui/plan/blocks/LandingBlock.tsx:56](../../src/ui/plan/blocks/LandingBlock.tsx#L56) | кто остался на планете после потерь считает UI; брать состояние после боя из домена | #duplicate-of-domain | m | P2-313 |
| P2-368 | arch |  | [src/ui/plan/EntryList.tsx:214](../../src/ui/plan/EntryList.tsx#L214) | без plan владельцы частей берутся сырыми game.expedition.slices с приведением типа и без частей из плана; всегда sliceOwners (plan обязателен) |  | s | P2-369 |
| P2-369 | arch |  | [src/ui/drawers/ExpeditionWidget.tsx:9](../../src/ui/drawers/ExpeditionWidget.tsx#L9) | sliceOwners — правило владения частями экспедиции; в domain/thundersEdge.ts |  | s |  |
| P2-406 | arch |  | [src/ui/screens/PlanScreen.tsx:79](../../src/ui/screens/PlanScreen.tsx#L79) | тела новых записей собраны в экране (здесь и тактическое в onTileTap): фабрика domain/newEntry.ts по типу действия | #new-entry #duplicate-of-domain | s |  |
| P2-409 | arch |  | [src/ui/screens/PlanScreen.tsx:281](../../src/ui/screens/PlanScreen.tsx#L281) | годность системы для Thunder's Edge по слоту решает экран: функция домена от game и слота (validThundersEdgeSystem берёт только тайл) | #thunders-edge #duplicate-of-domain | s |  |
| P2-410 | arch |  | [src/ui/screens/PlanScreen.tsx:36](../../src/ui/screens/PlanScreen.tsx#L36) | владельцы частей экспедиции берутся из виджета plan/: импортировать из domain/thundersEdge.ts после переноса sliceOwners | #thunders-edge | s |  |
| P2-416 | arch | 99, 32, 24 | [src/ui/screens/PlanScreen.tsx:487](../../src/ui/screens/PlanScreen.tsx#L487) | цели карт на карте (Warfare: системы с жетоном; Diplomacy без Mecatol; Construction без жетона до TE; база для dock) считает экран: domain/strategy.ts cardTargets(entry, состояние), здесь только раскраска | #card-targets #duplicate-of-domain | m |  |
| P2-419 | arch |  | [src/ui/screens/PlanScreen.tsx:457](../../src/ui/screens/PlanScreen.tsx#L457) | скорость, шаги и остаток хода считает экран, а IIFE ещё и пишет подсветку побочным эффектом: domain routeHint(draft, before) → {speed, steps, left, reach} | #route-hint | s |  |
| P2-432 | arch |  | [src/ui/screens/PlanScreen.tsx:759](../../src/ui/screens/PlanScreen.tsx#L759) | покупки карты для большого гекса собираются прямо в JSX: cardPurchases из StrategyEditor, cardChange и два одинаковых stateBeforeEntry; обработчик карты в домене или хуке | #card-purchases | s |  |
| P2-439 | arch |  | [src/ui/screens/GameScreen.tsx:92](../../src/ui/screens/GameScreen.tsx#L92) | новый id при совпадении придумывается в экране через Date.now: импорт под свободным id в storage/transfer | #import | s |  |
| P2-457 | arch |  | [src/ui/players/FactionPicker.tsx:9](../../src/ui/players/FactionPicker.tsx#L9) | дополнение фракции выясняется тремя loadPack и вычитанием наборов: дополнение фракции из домена (factionSheet) | #faction-groups | s |  |
| P2-203 | dup |  | [src/ui/map/stage/HexStage.tsx:118](../../src/ui/map/stage/HexStage.tsx#L118) | holderOf повторяет TileView: держателя планеты в состоянии (rivalHolds, затем planetHolder) считать одной функцией домена в players.ts | #duplicate-of-domain #rivals | s |  |
| P2-220 | dup |  | [src/ui/map/TileView.tsx:200](../../src/ui/map/TileView.tsx#L200) | Копия holderOf из HexStage: держатель планеты из функции домена | #duplicate-of-domain #rivals | s | P2-203 |
| P2-258 | dup |  | [src/ui/map/builder/TileNumberInput.tsx:41](../../src/ui/map/builder/TileNumberInput.tsx#L41) | Причину отказа (номер неоднозначен или неизвестен) UI выясняет сам, повторяя поиск: пусть resolveTile в domain/mapBuilder.ts её возвращает | #map-builder | s |  |
| P2-307 | dup |  | [src/ui/plan/tactical.ts:217](../../src/ui/plan/tactical.ts#L217) | выбор пула «планета или космос» по move.from повторён в flightRoutes, flies, stateInFlight и UnitPicker.available; один доменный poolOf |  | s | P2-306 |
| P2-311 | dup |  | [src/ui/plan/editors/TacticalEditor.tsx:57](../../src/ui/plan/editors/TacticalEditor.tsx#L57) | деление «летит / груз» источника считается здесь, в EntrySteps и в tacticalMeters; брать из одной доменной функции | #duplicate-of-domain | m |  |
| P2-343 | dup |  | [src/ui/plan/EntrySteps.tsx:78](../../src/ui/plan/EntrySteps.tsx#L78) | кто летит, кто на борту и где подобран пересчитаны здесь; брать из домена | #duplicate-of-domain | m | P2-311 |
| P2-407 | dup |  | [src/ui/screens/PlanScreen.tsx:318](../../src/ui/screens/PlanScreen.tsx#L318) | тело тактической записи и её владелец по fromCard собираются здесь: брать из domain/newEntry.ts | #new-entry | s | P2-406 |
| P2-417 | dup |  | [src/ui/screens/PlanScreen.tsx:478](../../src/ui/screens/PlanScreen.tsx#L478) | годный источник (система с доступными юнитами) считается здесь и в startsArrow одинаково: одна функция домена над состоянием перед записью | #valid-sources | s |  |
| P2-418 | dup |  | [src/ui/screens/PlanScreen.tsx:506](../../src/ui/screens/PlanScreen.tsx#L506) | та же проверка годного источника, что в подсветке выбора: взять функцию домена | #valid-sources | s | P2-417 |
| P2-470 | dup |  | [src/ui/units/unitOrder.ts:3](../../src/ui/units/unitOrder.ts#L3) | порядок юнитов повторяет ORDER из domain/hexLayout.ts: экспортировать из домена и брать оттуда | #duplicate-of-domain | s |  |

<a id="ws-ui-warnings"></a>
### Показ нарушений · `ui-warnings` · волна 1

**Цель.** Все нарушения показывает WarningList; раскладка по шагу и месту из домена, не по коду; остаток вверху редактора.

**Опирается на:** `rule-engine`

**Файлы потока:** `src/ui/plan/WarningText.tsx`, `src/ui/plan/warningPlaces.ts`

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-210 | dup |  | [src/ui/map/stage/HexStage.tsx:307](../../src/ui/map/stage/HexStage.tsx#L307) | Перебор ресурсов, флота и вместимости решает сам (over, класс stage-meter-over): красить счётчики по кодам shortResources/fleetPool/capacitySystem записи — P2 note: an entry's meters now read its codes; a manual build (adjustment of kind build) has no rule check in the domain (applyAdjustment checks no fleet pool, capacity or cost), so without an entry the counters still compare themselves until the domain checks a manual build | #warning-channel #duplicate-of-domain | m |  |

<a id="ws-ui-containers"></a>
### Контейнеры визуального языка · `ui-containers` · волна 1

**Цель.** Section, SectionTitle, PlayerDot, PlayerChoice, UnitTile, ConfirmBar, Modal, DrawerSheet, Popover, MapPickButton вместо ручных сборок.

**Опирается на:** `ui-structure`

**Файлы потока:** `src/ui/primitives/*`, `src/ui/overlays/*`

**Нужно ваше решение или прототип:** P2-243 (prototype), P2-250 (prototype), P2-253 (prototype), P2-261 (prototype), P2-264 (prototype), P2-247 (prototype), P2-319 (prototype), P2-323 (prototype), P2-329 (prototype), P2-332 (prototype), P2-334 (prototype), P2-340 (prototype), P2-362 (prototype), P2-371 (prototype), P2-383 (prototype), P2-427 (prototype), P2-436 (prototype)

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-259 | arch |  | [src/ui/overlays/TilePopover.tsx:17](../../src/ui/overlays/TilePopover.tsx#L17) | Поповер привязан только к гексу (ищет [data-slot] polygon): общий Popover с якорем в overlays/, его же взять для .map-import | #popover #overlays | m |  |
| P2-356 | arch |  | [src/ui/plan/editors/ExpeditionEditor.tsx:28](../../src/ui/plan/editors/ExpeditionEditor.tsx#L28) | флаг ручной оплаты хранится здесь, а TacticalEditor и StrategyEditor получают его от PlanScreen; одно место для всех PaymentBlock |  | s |  |
| P2-202 | dup |  | [src/ui/map/stage/HexStage.tsx:93](../../src/ui/map/stage/HexStage.tsx#L93) | Свой обработчик Escape, как в Drawer и FactionPicker: его возьмёт на себя Modal | #modal | s | P2-201 |
| P2-208 | dup |  | [src/ui/map/stage/HexStage.tsx:269](../../src/ui/map/stage/HexStage.tsx#L269) | Кнопка потери .stage-loss — ещё одна плитка юнита с числом: UnitTile variant="loss" | #unit-tile | s | P2-261 |
| P2-226 | dup |  | [src/ui/map/TileView.tsx:324](../../src/ui/map/TileView.tsx#L324) | SVG жетона приказа повторён здесь, у жетонов соперников ниже и в MapLegend: один компонент CommandTokenMark с цветом игрока | #command-token #svg | s |  |
| P2-227 | dup |  | [src/ui/map/TileView.tsx:340](../../src/ui/map/TileView.tsx#L340) | Метка ingress нарисована здесь и в MapLegend отдельно: один компонент IngressMark | #ingress #svg | s |  |
| P2-230 | dup |  | [src/ui/map/RouteArrows.tsx:33](../../src/ui/map/RouteArrows.tsx#L33) | Вершины бейджа и выреза заданы строками, хотя это hexPoints(10.5) и hexPoints(15); бейдж номера и метка «+N» повторены в MapLegend и OrderHex в EntryList: общий компонент RouteBadge | #route-badge #svg | s |  |
| P2-239 | dup |  | [src/ui/drawers/MapLegend.tsx:58](../../src/ui/drawers/MapLegend.tsx#L58) | Свой aside role=dialog с h2: DrawerSheet | #drawer-sheet | s | P2-238 |
| P2-240 | dup |  | [src/ui/drawers/MapLegend.tsx:105](../../src/ui/drawers/MapLegend.tsx#L105) | Значок места свёрстан заново с жёстким var(--player-2) во style: тот же значок, что на тайле | #player-colour #inline-style #legend | s | P2-224 |
| P2-241 | dup |  | [src/ui/drawers/MapLegend.tsx:101](../../src/ui/drawers/MapLegend.tsx#L101) | Копия SVG жетона приказа из TileView: CommandTokenMark | #command-token #svg | s | P2-226 |
| P2-242 | dup |  | [src/ui/drawers/MapLegend.tsx:103](../../src/ui/drawers/MapLegend.tsx#L103) | Копия метки ingress из TileView: IngressMark | #ingress #svg | s | P2-227 |
| P2-243 | dup |  | [src/ui/drawers/MapLegend.tsx:29](../../src/ui/drawers/MapLegend.tsx#L29) | Своя планета легенды вместо PlanetMark из TileView: легенда расходится с картой; рисовать PlanetMark | #legend #planet | s |  |
| P2-244 | dup |  | [src/ui/drawers/MapLegend.tsx:9](../../src/ui/drawers/MapLegend.tsx#L9) | Копии вершин гекса и бейджа из HexMap: брать hexPoints и RouteBadge | #route-badge #svg | s | P2-230 |
| P2-246 | dup |  | [src/ui/drawers/MapLegend.tsx:117](../../src/ui/drawers/MapLegend.tsx#L117) | Метка подбора «+N» свёрстана заново, как в RouteArrows: общий компонент | #route-badge #svg | s | P2-230 |
| P2-248 | dup |  | [src/ui/map/builder/MapStringImport.tsx:41](../../src/ui/map/builder/MapStringImport.tsx#L41) | Плавающая карточка .map-import повторяет .tile-popover, а panel-head собран руками: Popover с якорем и Section | #popover #section | m | P2-259 |
| P2-250 | dup |  | [src/ui/map/builder/MapStringImport.tsx:60](../../src/ui/map/builder/MapStringImport.tsx#L60) | Строка подтверждения .row (текст, «Заменить», «Отмена») — четвёртый вид после player-confirm, GameScreen и LayoutPicker: ConfirmBar | #confirm-bar | s |  |
| P2-253 | dup |  | [src/ui/map/builder/LayoutPicker.tsx:61](../../src/ui/map/builder/LayoutPicker.tsx#L61) | Строка подтверждения .row собрана руками: ConfirmBar | #confirm-bar | s | P2-250 |
| P2-261 | dup |  | [src/ui/map/stage/UnitShop.tsx:24](../../src/ui/map/stage/UnitShop.tsx#L24) | Ячейка .shop-item — одна из пяти плиток юнита с числом (UnitButton, .stage-loss, UnitPictures, Stack): UnitTile с вариантами take/taken/loss/shop | #unit-tile | m |  |
| P2-263 | dup |  | [src/ui/drawers/UpgradesPanel.tsx:23](../../src/ui/drawers/UpgradesPanel.tsx#L23) | Свой aside role=dialog с h2: DrawerSheet | #drawer-sheet | s | P2-238 |
| P2-264 | dup |  | [src/ui/drawers/UpgradesPanel.tsx:37](../../src/ui/drawers/UpgradesPanel.tsx#L37) | Переключатель улучшения .upgrade-card повторяет .ship-row-live из ShipStats: один вид | #upgrade-toggle | s |  |
| P2-266 | dup |  | [src/ui/drawers/ThundersEdgePanel.tsx:19](../../src/ui/drawers/ThundersEdgePanel.tsx#L19) | Свой aside role=dialog с h2: DrawerSheet | #drawer-sheet | s | P2-238 |
| P2-314 | dup |  | [src/ui/plan/editors/TacticalEditor.tsx:52](../../src/ui/plan/editors/TacticalEditor.tsx#L52) | строка «юнит N, …» собрана здесь, в StrategyEditor (builtUnits), AdjustmentEditor и EntrySteps (signed); один помощник unitsText в ui/units |  | s |  |
| P2-335 | dup |  | [src/ui/plan/editors/StrategyEditor.tsx:160](../../src/ui/plan/editors/StrategyEditor.tsx#L160) | сетка карт стратегии повторяет StrategyCards.tsx; общий CardGrid |  | s |  |
| P2-347 | dup |  | [src/ui/plan/EntrySteps.tsx:189](../../src/ui/plan/EntrySteps.tsx#L189) | копия signed из AdjustmentEditor |  | s | P2-314 |
| P2-352 | dup |  | [src/ui/plan/EntryList.tsx:119](../../src/ui/plan/EntryList.tsx#L119) | бейдж номера нарисован третий раз (HexMap, MapLegend); один компонент |  | s |  |
| P2-364 | dup |  | [src/ui/plan/editors/AdjustmentEditor.tsx:33](../../src/ui/plan/editors/AdjustmentEditor.tsx#L33) | signed повторён в EntrySteps |  | s | P2-314 |
| P2-384 | dup |  | [src/ui/plan/StrategyCards.tsx:61](../../src/ui/plan/StrategyCards.tsx#L61) | та же сетка карт, что в StrategyEditor |  | s | P2-335 |
| P2-512 | dup |  | [src/ui/theme.css:216](../../src/ui/theme.css#L216) | маленькая кнопка: 14 контекстных переопределений padding/min-height/font-size: 180, 226, 251, 398, 401, 418, 433, 440, 547, 576, 636, 701, 712, 739; модификатор .small или проп у кнопки | #small-button | m |  |
| P2-513 | dup |  | [src/ui/theme.css:235](../../src/ui/theme.css#L235) | плавающая карточка: .tile-popover и .map-import 680 одинаковы (surface-3, border-strong, radius, shadow, pop-in); общий Popover | #floating-card #popover | m |  |
| P2-515 | dup |  | [src/ui/theme.css:263](../../src/ui/theme.css#L263) | кружок игрока собран в 6 классах: .owner-dot, .status-player ::before 554, .player-badge 723, .seat-ghost-badge 805, .legend-dot 932, .legend-seat 933; компонент PlayerDot с размером | #player-dot | m |  |
| P2-517 | dup |  | [src/ui/theme.css:272](../../src/ui/theme.css#L272) | коробка модала трижды: .stage-dialog, .link-dialog 603, .fac-sheet 1012, скругления 14px и var(--radius) вперемешку; общий Modal | #modal | m |  |
| P2-520 | dup |  | [src/ui/theme.css:284](../../src/ui/theme.css#L284) | .shop-item (84px) ещё одна плитка юнита с числом: перейти на общий UnitTile | #unit-tile | s | P2-548 |
| P2-522 | dup |  | [src/ui/theme.css:297](../../src/ui/theme.css#L297) | .stage-loss (62px) ещё одна плитка юнита с числом: перейти на общий UnitTile | #unit-tile | s | P2-548 |
| P2-539 | dup |  | [src/ui/theme.css:527](../../src/ui/theme.css#L527) | .upic (32px) ещё одна плитка юнита с числом, бейдж i повторяет .pic i: перейти на общий UnitTile | #unit-tile | s | P2-548 |
| P2-542 | dup |  | [src/ui/theme.css:553](../../src/ui/theme.css#L553) | кружок игрока через ::before: перейти на PlayerDot | #player-dot | s | P2-515 |
| P2-548 | dup |  | [src/ui/theme.css:607](../../src/ui/theme.css#L607) | плитка юнита с числом: 4 класса (.pic, .shop-item 254, .stage-loss 268, .upic 524) и 5 компонентов, размеры 62/84/62/32, бейдж числа 257, 270, 617, 525; общий UnitTile с размером, радиус var(--radius-s) вместо 10px | #unit-tile | m |  |
| P2-549 | dup |  | [src/ui/theme.css:672](../../src/ui/theme.css#L672) | .map-import повторяет .tile-popover: перейти на общий Popover | #floating-card | s | P2-513 |
| P2-554 | dup |  | [src/ui/theme.css:710](../../src/ui/theme.css#L710) | .player-badge: кружок игрока большого размера, перейти на PlayerDot | #player-dot | s | P2-515 |
| P2-556 | dup |  | [src/ui/theme.css:721](../../src/ui/theme.css#L721) | строка подтверждения: .player-confirm, строка сохранения GameScreen:163, .row в LayoutPicker и MapStringImport; общий ConfirmBar | #confirm-bar | m |  |
| P2-560 | dup |  | [src/ui/theme.css:786](../../src/ui/theme.css#L786) | .seat-ghost-badge: кружок игрока, перейти на PlayerDot | #player-dot | s | P2-515 |
| P2-562 | dup |  | [src/ui/theme.css:814](../../src/ui/theme.css#L814) | переключатель улучшения дважды: .ship-row-live и .upgrade-card 855 (рамка, gold при выборе, disabled без затухания); один компонент | #upgrade-toggle | m |  |
| P2-563 | dup |  | [src/ui/theme.css:832](../../src/ui/theme.css#L832) | .upgrade-card повторяет .ship-row-live 836: перейти на общий переключатель | #upgrade-toggle | s | P2-562 |
| P2-568 | dup |  | [src/ui/theme.css:900](../../src/ui/theme.css#L900) | .legend-dot и .legend-seat 933: кружок игрока, перейти на PlayerDot | #player-dot | s | P2-515 |
| P2-570 | dup |  | [src/ui/theme.css:932](../../src/ui/theme.css#L932) | заголовок раздела: общее правило для 8 классов, а ранние определения 247, 530, 552, 610, 698, 742, 925 перебиты и мертвы, LayoutPicker 711 сам по себе; компонент SectionTitle с одним классом | #section-title | m |  |
| P2-201 | ui |  | [src/ui/map/stage/HexStage.tsx:343](../../src/ui/map/stage/HexStage.tsx#L343) | Модал собран руками (.stage + .stage-dialog, без портала), третья копия после FactionPicker и ShareConflict: Modal с title, onClose и HexRemove | #modal | m |  |
| P2-213 | ui |  | [src/ui/map/stage/HexStage.tsx:381](../../src/ui/map/stage/HexStage.tsx#L381) | Выбор игрока точкой и именем собран руками, цвет через var(--player-N) во style: PlayerChoice с PlayerDot | #player-colour #inline-style #rivals | m |  |
| P2-214 | ui |  | [src/ui/map/stage/HexStage.tsx:429](../../src/ui/map/stage/HexStage.tsx#L429) | Вторая ручная сборка выбора игрока (контроль планеты) с цветом во style: PlayerChoice с вариантом «Нет» | #player-colour #inline-style | s | P2-213 |
| P2-215 | ui |  | [src/ui/map/stage/HexStage.tsx:392](../../src/ui/map/stage/HexStage.tsx#L392) | Голые h3 здесь и в lossStrip, уровни заголовков произвольные: SectionTitle | #section-title | s |  |
| P2-223 | ui |  | [src/ui/map/TileView.tsx:129](../../src/ui/map/TileView.tsx#L129) | Цвет игрока через var(--player-N) во style (здесь, у места, у жетонов, в HexMap, UpgradesPanel): playerVar() или data-player с правилом в теме | #player-colour #inline-style | m |  |
| P2-224 | ui |  | [src/ui/map/TileView.tsx:313](../../src/ui/map/TileView.tsx#L313) | Значок места красится style fill var(--player-N): playerVar() или data-player; тот же значок нужен легенде | #player-colour #inline-style | s | P2-223 |
| P2-225 | ui |  | [src/ui/map/TileView.tsx:332](../../src/ui/map/TileView.tsx#L332) | Жетон соперника красится style fill var(--player-N): playerVar() или data-player | #player-colour #inline-style #rivals | s | P2-223 |
| P2-228 | ui |  | [src/ui/map/RouteArrows.tsx:69](../../src/ui/map/RouteArrows.tsx#L69) | Цвет стрелки соперника через style --route: var(--player-N): data-player или playerVar() | #player-colour #inline-style #rivals | s | P2-223 |
| P2-229 | ui |  | [src/ui/map/RouteArrows.tsx:82](../../src/ui/map/RouteArrows.tsx#L82) | Бейдж повторяет style --route стрелки: data-player или playerVar() | #player-colour #inline-style #rivals | s | P2-223 |
| P2-238 | ui |  | [src/ui/overlays/Drawer.tsx:30](../../src/ui/overlays/Drawer.tsx#L30) | Шторка даёт только коробку: каждое содержимое (легенда, улучшения, Thunder's Edge, игроки) собирает свой aside с role=dialog и h2; добавить DrawerSheet с title | #drawer #drawer-sheet | m |  |
| P2-247 | ui |  | [src/ui/map/builder/MapStringImport.tsx:46](../../src/ui/map/builder/MapStringImport.tsx#L46) | Текстовая кнопка «Закрыть»: HexRemove, как везде | #close-button | s |  |
| P2-262 | ui |  | [src/ui/drawers/UpgradesPanel.tsx:22](../../src/ui/drawers/UpgradesPanel.tsx#L22) | style --player: var(--player-N): data-player или playerVar() | #player-colour #inline-style | s | P2-223 |
| P2-316 | ui |  | [src/ui/plan/editors/TacticalEditor.tsx:108](../../src/ui/plan/editors/TacticalEditor.tsx#L108) | блоки редактора собраны руками (div.editor-section > strong, optional-note только здесь); Section(title, optional, action, warnings) во всех редакторах | #section | m |  |
| P2-319 | ui |  | [src/ui/plan/editors/TacticalEditor.tsx:203](../../src/ui/plan/editors/TacticalEditor.tsx#L203) | голова и подвал редакторов четырёх видов (здесь panel-head и «Готово» вверху, у StrategyEditor h2 и подвал, у UnitPicker текстовое «Закрыть»); класса .tactical-editor в CSS нет. Одна рамка редактора | #editor-frame | m |  |
| P2-320 | ui |  | [src/ui/plan/editors/UnitPicker.tsx:42](../../src/ui/plan/editors/UnitPicker.tsx#L42) | плитка юнита с числом: UnitButton, Stack (LandingBlock), UnitPictures (EntrySteps), плитки HexStage и UnitShop — разные компоненты и классы; один UnitTile с вариантами take/taken/loss/shop в ui/units | #unit-tile | m |  |
| P2-323 | ui |  | [src/ui/plan/editors/UnitPicker.tsx:137](../../src/ui/plan/editors/UnitPicker.tsx#L137) | текстовое «Закрыть» вместо HexRemove; «Удалить источник» в подвале повторяет крестик строки источника |  | m | P2-319 |
| P2-325 | ui |  | [src/ui/plan/editors/UnitPicker.tsx:142](../../src/ui/plan/editors/UnitPicker.tsx#L142) | заголовки подблоков h4.picker-title вручную; SectionTitle |  | s |  |
| P2-329 | ui |  | [src/ui/plan/editors/cards/politics.tsx:8](../../src/ui/plan/editors/cards/politics.tsx#L8) | выбор игрока (точка цвета + имя, inline var(--player-…)) собран руками здесь, в Trade ниже, в HexStage и PlanScreen; общий PlayerChoice с PlayerDot | #player-choice | m |  |
| P2-330 | ui |  | [src/ui/plan/editors/cards/trade.tsx:10](../../src/ui/plan/editors/cards/trade.tsx#L10) | вторая ручная сборка выбора игрока; PlayerChoice | #player-choice | s | P2-329, ~~P2-328~~ ✓ |
| P2-332 | ui |  | [src/ui/plan/editors/cards/technology.tsx:21](../../src/ui/plan/editors/cards/technology.tsx#L21) | «−» на месте .in-card, где по соглашению удаление, а делает уменьшение; Stepper |  | s |  |
| P2-334 | ui |  | [src/ui/plan/editors/StrategyEditor.tsx:158](../../src/ui/plan/editors/StrategyEditor.tsx#L158) | голый h2 и подвал .strategy-foot вместо общей рамки редактора |  | m | P2-319 |
| P2-338 | ui |  | [src/ui/plan/editors/StrategyEditor.tsx:76](../../src/ui/plan/editors/StrategyEditor.tsx#L76) | блоки (жетоны, Diplomacy, Politics, Trade, Technology, улучшения) собраны вручную из div.editor-section; Section | #section | m | P2-316 |
| P2-340 | ui |  | [src/ui/plan/blocks/TokenTiles.tsx:40](../../src/ui/plan/blocks/TokenTiles.tsx#L40) | ещё один вид «−»; Stepper |  | s | P2-332 |
| P2-341 | ui |  | [src/ui/plan/EntrySteps.tsx:20](../../src/ui/plan/EntrySteps.tsx#L20) | своя плитка юнита (.upic); UnitTile | #unit-tile | m | P2-320 |
| P2-350 | ui |  | [src/ui/plan/EntryList.tsx:70](../../src/ui/plan/EntryList.tsx#L70) | цвет игрока inline-стилем var(--player-…) в .status-player ниже; PlayerDot / data-player / playerVar() |  | s |  |
| P2-353 | ui |  | [src/ui/plan/EntryList.tsx:180](../../src/ui/plan/EntryList.tsx#L180) | --owner inline-стилем var(--player-…) у строки ниже; data-player / playerVar() |  | s | P2-350 |
| P2-358 | ui |  | [src/ui/plan/blocks/LandingBlock.tsx:7](../../src/ui/plan/blocks/LandingBlock.tsx#L7) | плитка юнита берётся из файла перелёта, а Stack ниже — ещё одна плитка; обе заменить UnitTile | #unit-tile | m | P2-320 |
| P2-361 | ui |  | [src/ui/plan/blocks/PaymentBlock.tsx:40](../../src/ui/plan/blocks/PaymentBlock.tsx#L40) | блок собран вручную (editor-section + panel-head); Section с action | #section | m | P2-316 |
| P2-362 | ui |  | [src/ui/plan/editors/AdjustmentEditor.tsx:43](../../src/ui/plan/editors/AdjustmentEditor.tsx#L43) | чужой класс .tactical-editor (которого нет в CSS), своя голова и ручные блоки; общая рамка редактора и Section |  | m | P2-319, P2-316 |
| P2-371 | ui |  | [src/ui/drawers/ExpeditionWidget.tsx:65](../../src/ui/drawers/ExpeditionWidget.tsx#L65) | текстовое «Убрать» вместо HexRemove |  | m | P2-323 |
| P2-383 | ui |  | [src/ui/plan/PlanTabs.tsx:95](../../src/ui/plan/PlanTabs.tsx#L95) | удаление плана текстовой кнопкой и раунда «−» ниже вместо HexRemove |  | m |  |
| P2-385 | ui |  | [src/ui/plan/blocks/EntryUpgrades.tsx:20](../../src/ui/plan/blocks/EntryUpgrades.tsx#L20) | --player inline-стилем у корня; data-player / playerVar() |  | s | P2-350 |
| P2-425 | ui |  | [src/ui/screens/PlanScreen.tsx:660](../../src/ui/screens/PlanScreen.tsx#L660) | плашка «действие за» красит край и точку inline-стилем var(--player-N): PlayerDot и playerVar()/data-player (аудит 3.7) | #player-colour #inline-style | s |  |
| P2-427 | ui |  | [src/ui/screens/PlanScreen.tsx:667](../../src/ui/screens/PlanScreen.tsx#L667) | своя голова редактора с текстовой «Отмена» вместо общей головы редактора и HexRemove (аудит 3.3, 3.4) | #editor-head | s |  |
| P2-430 | ui |  | [src/ui/screens/PlanScreen.tsx:730](../../src/ui/screens/PlanScreen.tsx#L730) | выбор «за кого» занимает класс большого гекса stage-owners и красит кнопки inline-стилем: PlayerChoice (аудит 3.6) | #player-colour #player-choice | s | P2-425 |
| P2-436 | ui |  | [src/ui/screens/GameScreen.tsx:156](../../src/ui/screens/GameScreen.tsx#L156) | своя строка подтверждения удаления, ещё один вид рядом с .player-confirm и строками LayoutPicker/MapStringImport: общий ConfirmBar | #confirm-bar | s |  |
| P2-437 | ui |  | [src/ui/screens/GameScreen.tsx:160](../../src/ui/screens/GameScreen.tsx#L160) | класс .danger не описан в теме, «Удалить» выглядит обычной кнопкой: вариант danger у ConfirmBar | #confirm-bar #danger | s | P2-436 |
| P2-443 | ui |  | [src/ui/screens/GameScreen.tsx:121](../../src/ui/screens/GameScreen.tsx#L121) | заголовки групп «Партии» — p.side-label, в других местах h2/h3/strong для того же вида: SectionTitle | #section-title | s |  |
| P2-452 | ui |  | [src/ui/common/ShareConflict.tsx:12](../../src/ui/common/ShareConflict.tsx#L12) | модал собран руками (.stage + .link-dialog) без Escape и шапки с HexRemove, третья копия рядом с HexStage и FactionPicker: общий Modal (аудит 3.5) | #modal | s |  |
| P2-459 | ui |  | [src/ui/players/FactionPicker.tsx:55](../../src/ui/players/FactionPicker.tsx#L55) | модал с порталом, Escape и шапкой собран руками: общий Modal | #modal | s | P2-452 |
| P2-461 | ui |  | [src/ui/players/PlayerList.tsx:66](../../src/ui/players/PlayerList.tsx#L66) | своя строка подтверждения .player-confirm: общий ConfirmBar | #confirm-bar | s | P2-436 |
| P2-462 | ui |  | [src/ui/players/PlayerList.tsx:99](../../src/ui/players/PlayerList.tsx#L99) | цвет игрока --player задаётся inline-стилем: data-player/playerVar() | #player-colour #inline-style | s | P2-425 |
| P2-463 | ui |  | [src/ui/players/PlayerList.tsx:84](../../src/ui/players/PlayerList.tsx#L84) | h1 в списке, который стоит и в шторке, рядом с h2 других шторок: заголовок от DrawerSheet/SectionTitle | #section-title #drawer-sheet | s |  |
| P2-467 | ui |  | [src/ui/players/SeatMap.tsx:96](../../src/ui/players/SeatMap.tsx#L96) | цвет игрока inline-стилем здесь и у значка призрака: data-player/playerVar() | #player-colour #inline-style | s | P2-425 |
| P2-514 | ui |  | [src/ui/theme.css:253](../../src/ui/theme.css#L253) | .panel берут и тут же снимают с неё всё оформление (ещё .players-aside .layout-picker 709): LayoutPicker и TileNumberInput без .panel или с вариантом | #panel-reset | s |  |

<a id="ws-command-tokens"></a>
### Жетоны приказа и активация · `command-tokens` · волна 2

**Цель.** Активация (89.1), тактический резерв (20.4), 16 жетонов (20.3), жетон в систему со своим жетоном (20.6), сжатие резерва флота (37.3, 81.5.1).

**Опирается на:** `replay-steps`

**Файлы потока:** `src/domain/project.ts (activation, statusTokens)`

_Нет TODO._

<a id="ws-movement"></a>
### Движение и маршруты · `movement` · волна 2

**Цель.** Граф маршрутов в своём модуле; проверка всего пути, а не только отмеченных точек; разлом +1 за каждый; дом вне карты (Creuss); гиперпуть не система; подсветка возврата в активную систему.

**Опирается на:** `replay-steps`

**Файлы потока:** `src/domain/movement.ts (new, from project.ts)`, `src/domain/route.ts (graph part)`

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-011 | bug | 6-note-2 | [src/domain/route.ts:26](../../src/domain/route.ts#L26) | Ключ не вида q,r считается в одном шаге от всего: после P2-010 бросать ошибку или возвращать Infinity — P2 note: after P2-010 the off-map home is a node of the route graph, so no real system key reaches this fallback; Infinity breaks about 20 unit and screen tests whose fixtures use letter slot keys ('A', 'B', 'H') one step apart, so the fallback stays until those fixtures move to q,r keys | #Creuss | s | ~~P2-010~~ ✓ |

<a id="ws-transport"></a>
### Перевозка и подбор · `transport` · волна 2

**Цель.** Подбор только из старта, пути и активной системы, не из системы со своим жетоном (95.1, 95.3); брошенные без мест на борту юниты в системах, откуда улетели (16.3, 43.1, 95 примечание 4).

**Опирается на:** `replay-steps`

**Файлы потока:** `src/domain/transport.ts (new)`, `src/ui/plan/UnitPicker.tsx (offer)`

_Нет TODO._

<a id="ws-combat-order"></a>
### Порядок проверок вокруг боя · `combat-order` · волна 2

**Цель.** Флот проверяется при прилёте, до боя (37.3); высадка не больше мест на борту после боя (16.3.3); возврат ошибочной потери возвращает высадку.

**Опирается на:** `replay-steps`

**Файлы потока:** `src/domain/project.ts (landAndBuild order)`, `src/ui/plan/tactical.ts (withLoss)`

_Нет TODO._

<a id="ws-invasion"></a>
### Вторжение и контроль · `invasion` · волна 2

**Цель.** Контроль только при выживших войсках (49.5), у меня и у соперника; высадка только наземных войск и только в активной системе; планета, взятая у соперника, уходит из его счёта.

**Опирается на:** `replay-steps`

**Файлы потока:** `src/domain/project.ts (landUnits, rival landings)`

_Нет TODO._

<a id="ws-structures"></a>
### Строения и их владельцы · `structures` · волна 2

**Цель.** У базы и PDS есть владелец; они уничтожаются при захвате планеты (49.5.1, 63.4, 79.4); лимиты на планете (85.4-85.6).

**Опирается на:** `replay-steps`, `data`

**Файлы потока:** `src/domain/types.ts (docks, pds)`, `src/storage/schema.ts (migration)`

_Нет TODO._

<a id="ws-production"></a>
### Производство · `production` · волна 2

**Цель.** Место производства (68.3, 67.4.1); блокада и чужие корабли (14.1, 67.6); нет базы как нарушение домена; лимит Production (68.1); запас отрядов (67.5).

**Опирается на:** `replay-steps`, `data`

**Файлы потока:** `src/domain/production.ts (new, from project.ts)`

_Нет TODO._

<a id="ws-payment"></a>
### Оплата · `payment` · волна 2

**Цель.** Оплата и подготовка только своими планетами (34 примечание 2, 64 примечание 5, 71 примечание 3).

**Опирается на:** `replay-steps`

**Файлы потока:** `src/domain/payment.ts`, `src/domain/project.ts (pay)`

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-366 | dup |  | [src/ui/plan/editors/ExpeditionEditor.tsx:30](../../src/ui/plan/editors/ExpeditionEditor.tsx#L30) | «платится ресурсами или влиянием» проверяется дважды и трижды приводится as 'resources' \| 'influence'; доменный помощник оплаты части — P2 note: UI-файл вне списка файлов волны B для payment, рядом правит P2-365 (thunders-edge); оставлено, чтобы не править чужой модуль |  | s |  |

<a id="ws-strategy-cards"></a>
### Карты стратегии · `strategy-cards` · волна 2

**Цель.** Обработчик на каждую карту вместо цепочки if; кто какое свойство какой карты может применить (83.3, 83.4, 82); forToken выводится из карт раунда; Imperial, Warfare, Trade, Diplomacy, Construction, Technology по правилам.

**Опирается на:** `replay-steps`

**Файлы потока:** `src/domain/strategy.ts`, `src/domain/cards/*.ts (new)`, `src/ui/plan/StrategyEditor.tsx (logic only)`

_Нет TODO._

<a id="ws-round-flow"></a>
### Ход раунда · `round-flow` · волна 2

**Цель.** Пас и действия после паса (3.3, 3.4, 82.2); действие не в своей фазе (40.2).

**Опирается на:** `replay-steps`

**Файлы потока:** `src/domain/round.ts (new)`

_Нет TODO._

<a id="ws-thunders-edge"></a>
### Thunder's Edge · `thunders-edge` · волна 2

**Цель.** Экспедиция (часть технологий, повтор, одна за ход), энтропийный шрам, станции, входы и выходы Излома.

**Опирается на:** `replay-steps`, `data`

**Файлы потока:** `src/domain/thundersEdge.ts`, `src/domain/payment.ts (EXPEDITION_SLICES)`

_Нет TODO._

<a id="ws-ui-nesting"></a>
### Вложенность экранов (нужен прототип) · `ui-nesting` · волна 2

**Цель.** Не больше трёх уровней: шаги, отдельное меню, модал или шторка там, где глубже. Каждое изменение раскладки сначала прототипом на утверждение.

**Опирается на:** `ui-containers`

**Файлы потока:** `src/ui/plan/*Editor.tsx`, `src/ui/map/HexStage.tsx`, `src/ui/plan/EntryList.tsx`

**Нужно ваше решение или прототип:** P2-200 (prototype), P2-428 (prototype), P2-217 (prototype), P2-317 (prototype), P2-318 (prototype), P2-337 (prototype), P2-346 (prototype), P2-349 (prototype), P2-355 (prototype), P2-357 (prototype)

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-200 | arch |  | [src/ui/map/stage/HexStage.tsx:69](../../src/ui/map/stage/HexStage.tsx#L69) | 440 строк: модал, три режима, правка чужих юнитов, оплата производства и счётчики в одном компоненте; разделить на оболочку и панели setup/battle/build, покупки вынести в хук | #hex-stage #srp | l |  |
| P2-207 | arch |  | [src/ui/map/stage/HexStage.tsx:211](../../src/ui/map/stage/HexStage.tsx#L211) | Один обработчик нажатия на жетон ветвится по режиму, владельцу, виду и базовому составу: разбить на обработчики режимов | #hex-stage | m | P2-200 |
| P2-428 | arch |  | [src/ui/screens/PlanScreen.tsx:674](../../src/ui/screens/PlanScreen.tsx#L674) | редакторы и список взаимоисключаются цепочкой !session && !cardEntry && ..., редактор вложен в панель, UnitPicker и HexStage ещё глубже: один слот панели по состоянию автомата, шаги или отдельное меню по прототипу | #nesting | l | P2-400 |
| P2-219 | dup |  | [src/ui/map/stage/HexStage.tsx:133](../../src/ui/map/stage/HexStage.tsx#L133) | Тактическая запись ищется дважды (fightingFor и tactical ниже) по разным правилам: одна запись, которой принадлежат бой и покупки | #hex-stage | s | P2-200 |
| P2-217 | ui |  | [src/ui/map/stage/HexStage.tsx:417](../../src/ui/map/stage/HexStage.tsx#L417) | Свойства тайла и контроль планеты лежат пятым-шестым уровнем под режимом: отдельный режим сегмента или поповер | #nesting #hex-stage | m |  |
| P2-317 | ui |  | [src/ui/plan/editors/TacticalEditor.tsx:156](../../src/ui/plan/editors/TacticalEditor.tsx#L156) | «Бой» и «Производство» — блоки из одной кнопки; сделать строками .in-card |  | m | P2-316 |
| P2-318 | ui |  | [src/ui/plan/editors/TacticalEditor.tsx:148](../../src/ui/plan/editors/TacticalEditor.tsx#L148) | UnitPicker раскрывается внутри редактора (6 уровней); шаги: пока открыт перелёт, показывать только его с «Назад» |  | m |  |
| P2-337 | ui |  | [src/ui/plan/editors/StrategyEditor.tsx:155](../../src/ui/plan/editors/StrategyEditor.tsx#L155) | редактор длинный, 4 уровня; шаги: (1) карта и свойство, (2) параметры |  | m |  |
| P2-346 | ui |  | [src/ui/plan/EntrySteps.tsx:69](../../src/ui/plan/EntrySteps.tsx#L69) | подробности тактики 7 уровней; строки «откуда → куда» с UnitTile, полная схема в поповере |  | m |  |
| P2-349 | ui |  | [src/ui/plan/EntryList.tsx:53](../../src/ui/plan/EntryList.tsx#L53) | жетоны статуса раскрываются внутри строки записи (5 уровней); отдельное меню на месте списка, как Strategy и Adjustment |  | m |  |
| P2-355 | ui |  | [src/ui/plan/EntryList.tsx:213](../../src/ui/plan/EntryList.tsx#L213) | экспедиция раскрывается внутри строки (5 уровней); отдельное меню, как жетоны статуса |  | m | P2-349 |
| P2-357 | ui |  | [src/ui/plan/ActionMenu.tsx:17](../../src/ui/plan/ActionMenu.tsx#L17) | список действий раскрывается в подвале списка записей (4 уровня); поповер над кнопкой |  | m |  |

<a id="ws-ui-plan-screen"></a>
### Экран плана · `ui-plan-screen` · волна 2

**Цель.** Один автомат выбора на карте вместо 13 состояний; подсветка и перелёт в отдельных хуках.

**Опирается на:** `ui-logic-to-domain`

**Файлы потока:** `src/ui/screens/PlanScreen.tsx`

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-401 | model |  | [src/ui/screens/PlanScreen.tsx:105](../../src/ui/screens/PlanScreen.tsx#L105) | stage с флагами forCard/tacticalId/adjustmentId: размеченное объединение по тому, для кого открыт большой гекс, как часть автомата | #map-pick | s | P2-400 |
| P2-400 | arch |  | [src/ui/screens/PlanScreen.tsx:103](../../src/ui/screens/PlanScreen.tsx#L103) | 13 состояний режима (editing, choosing, tapPath, mapPick, systemPickFor, placing, marking, sheet, stage, adjustmentId, cardId, openId, shown) допускают невозможные сочетания и сбрасываются вручную: один автомат mapPick, размеченное объединение «что выбирает следующее нажатие» + «что открыто на панели» | #map-pick #state-machine | l |  |
| P2-403 | arch |  | [src/ui/screens/PlanScreen.tsx:172](../../src/ui/screens/PlanScreen.tsx#L172) | сброс состояний через setState во время рендера (и ниже rightDrawer/leftDrawer): выводить из game в автомате, а не догонять |  | s | P2-400 |
| P2-404 | arch |  | [src/ui/screens/PlanScreen.tsx:182](../../src/ui/screens/PlanScreen.tsx#L182) | перелёт и его повтор (startFlight, таймер повтора, loops, resting, inFlight, mapState) разбросаны по экрану: хук useFlightLoop, который отдаёт состояние карты и слой перелёта | #flight | m |  |
| P2-405 | arch |  | [src/ui/screens/PlanScreen.tsx:435](../../src/ui/screens/PlanScreen.tsx#L435) | состояние карты во время перелёта и между повторами считается посреди рендера: часть useFlightLoop | #flight | s | P2-404 |
| P2-408 | arch |  | [src/ui/screens/PlanScreen.tsx:232](../../src/ui/screens/PlanScreen.tsx#L232) | closePanels, onPick, onOpenEntry, toggleUpgrades сбрасывают по 3-11 флагов вручную, и наборы расходятся: один переход автомата «закрыть всё» |  | s | P2-400 |
| P2-411 | arch |  | [src/ui/screens/PlanScreen.tsx:287](../../src/ui/screens/PlanScreen.tsx#L287) | onTileTap из 8 веток с ранним return, их порядок и есть приоритет режимов: по обработчику на состояние автомата | #map-pick | m | P2-400 |
| P2-414 | arch |  | [src/ui/screens/PlanScreen.tsx:407](../../src/ui/screens/PlanScreen.tsx#L407) | отбор и тон стрелок плана (фокус, выполнено, режим «сейчас») перемешаны с рендером: в хук карты вместе с подсветкой |  | s | P2-415 |
| P2-415 | arch |  | [src/ui/screens/PlanScreen.tsx:418](../../src/ui/screens/PlanScreen.tsx#L418) | подсветку пишут в один объект 8 мест экрана, приоритет задаёт порядок записи и проверки !highlights[slot]: хук useMapHighlights(режим) с явным приоритетом, правила из домена | #highlight | m |  |
| P2-421 | arch |  | [src/ui/screens/PlanScreen.tsx:216](../../src/ui/screens/PlanScreen.tsx#L216) | stateBeforeEntry повторяет replay около 10 раз за рендер для одной записи (loops, routeSpeed, choosing, карты, startsArrow, редакторы, HexStage): считать один раз на запись в фокусе | #perf | s |  |
| P2-422 | arch |  | [src/ui/screens/PlanScreen.tsx:515](../../src/ui/screens/PlanScreen.tsx#L515) | цепочка тернарников подсказки повторяет приоритет режимов из onTileTap: подсказка как свойство состояния автомата | #map-pick | s | P2-400 |
| P2-423 | arch |  | [src/ui/screens/PlanScreen.tsx:133](../../src/ui/screens/PlanScreen.tsx#L133) | drawer, rightDrawer, leftDrawer, teOpen и их догон в рендере: хук useDrawers; «шторка уступает карте» при placing/marking — состояние автомата | #drawer | s |  |
| P2-424 | dup |  | [src/ui/screens/PlanScreen.tsx:549](../../src/ui/screens/PlanScreen.tsx#L549) | владелец записи в руках ищется заново тем же поиском по fromCard, что в onTileTap: брать из состояния автомата | #rivals | s | P2-400 |
| P2-429 | dup |  | [src/ui/screens/PlanScreen.tsx:694](../../src/ui/screens/PlanScreen.tsx#L694) | переключатель ручной оплаты по id записи написан дважды (тактика и карта): одна функция toggleManualPayment(id) |  | s |  |
| P2-402 | doc |  | [src/ui/screens/PlanScreen.tsx:52](../../src/ui/screens/PlanScreen.tsx#L52) | комментарий про Editing стоит над DrawerName: перенести к интерфейсу Editing |  | s |  |

<a id="ws-rivals"></a>
### Соперники в общей картине · `rivals` · волна 3

**Цель.** Маршруты и блокировки видят действия соперников по плану; взгляд соперника видит мои корабли; списки выбора на картах соперника верны.

**Опирается на:** `replay-steps`, `movement`

**Файлы потока:** `src/domain/players.ts (gameAs)`, `src/domain/project.ts (rival replay)`

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-360 | check |  | [src/ui/plan/blocks/LandingBlock.tsx:59](../../src/ui/plan/blocks/LandingBlock.tsx#L59) | чужие войска берутся из game.enemyGround (расстановка), а не из состояния соперников по плану (state.rivals): их высадки раньше в плане не видны — P2 note: rivals wave did the domain side (route blockers from the replay, gameAs opponents); this block gets only the owner's `before`, which lacks the other players' ground (for a rival's entry mine is nowhere in it), so it needs the full replay state passed in — a props change of a ui-containers file, left to the UI wave | #rivals | m |  |

## По правилам

| Правило | TODO |
|---|---|
| 6-note-2 | P2-011 |
| 24 | P2-416 |
| 32 | P2-416 |
| 83.3 | P2-063 |
| 99 | P2-416 |

## По слоям и тегам

Слои: domain 1, i18n 2, docs 2, ui 162.

Теги: #duplicate-of-domain 16, #player-colour 14, #inline-style 13, #rivals 10, #unit-tile 9, #svg 7, #confirm-bar 6, #modal 5, #section-title 5, #drawer-sheet 5, #player-dot 5, #hex-stage 4, #section 4, #map-pick 4, #route-badge 3, #legend 3, #popover 3, #upgrade-toggle 3, #player-choice 3, #i18n 2, #warning-channel 2, #nesting 2, #command-token 2, #ingress 2, #drawer 2, #layout 2, #panel 2, #flight 2, #new-entry 2, #thunders-edge 2, #valid-sources 2, #floating-card 2, #Creuss 1, #comments 1, #for-token 1, #srp 1, #enemy-units 1, #production 1, #payment 1, #structures 1, #stacks 1, #planet 1, #close-button 1, #hyperlanes 1, #chips 1, #map-builder 1, #overlays 1, #editor-frame 1, #state-machine 1, #highlight 1, #card-targets 1, #route-hint 1, #perf 1, #editor-head 1, #card-purchases 1, #danger 1, #import 1, #faction-groups 1, #selected-state 1, #small-button 1, #panel-reset 1.
