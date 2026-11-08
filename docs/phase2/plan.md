# План Фазы 2

Собрано скриптом `npm run plan:todos` из комментариев `TODO(P2-…)` в коде. Не правьте этот файл руками: правьте TODO и запустите скрипт снова.

Всего: **368** TODO в **88** файлах, **25** потоков.

## По типам

| Тип | Значение | Количество |
|---|---|---|
| `bug` | Ошибка: код делает то, что правило запрещает | 28 |
| `check` | Нет проверки: правило запрещает, нарушения нет | 19 |
| `model` | Нет модели: не хватает данных или понятия | 8 |
| `arch` | Архитектура: ответственность не на месте | 88 |
| `dup` | Дублирование | 117 |
| `dead` | Мёртвый код | 8 |
| `ui` | Визуальный язык: элемент вне общего контейнера | 89 |
| `vocab` | Термины игры | 2 |
| `data` | Данные | 5 |
| `doc` | Документация | 4 |

## Волны

Поток стоит на волну позже самого позднего из тех, на чей результат он опирается. Потоки одной волны независимы: их можно делать параллельно, у каждого свои файлы.

**Волна 0:** [rule-engine](#ws-rule-engine) (1), [domain-purity](#ws-domain-purity) (4), [data](#ws-data) (5), [ui-structure](#ws-ui-structure) (60), [ui-css](#ws-ui-css) (65), [vocab](#ws-vocab) (2), [docs](#ws-docs) (3)

**Волна 1:** [replay-steps](#ws-replay-steps) (0), [ui-logic-to-domain](#ws-ui-logic-to-domain) (36), [ui-warnings](#ws-ui-warnings) (14), [ui-containers](#ws-ui-containers) (91)

**Волна 2:** [command-tokens](#ws-command-tokens) (4), [movement](#ws-movement) (7), [transport](#ws-transport) (3), [combat-order](#ws-combat-order) (3), [invasion](#ws-invasion) (4), [structures](#ws-structures) (5), [production](#ws-production) (5), [payment](#ws-payment) (3), [strategy-cards](#ws-strategy-cards) (14), [round-flow](#ws-round-flow) (1), [thunders-edge](#ws-thunders-edge) (6), [ui-nesting](#ws-ui-nesting) (12), [ui-plan-screen](#ws-ui-plan-screen) (15)

**Волна 3:** [rivals](#ws-rivals) (5)

## Потоки

<a id="ws-rule-engine"></a>
### Нарушения правил как отдельный канал · `rule-engine` · волна 0

**Цель.** Тип нарушения с номером правила, шагом действия и местом возникновения; реестр проверок по шагам; контрактные тесты: у каждого правила есть тест, у каждого шага есть место показа, UI не создаёт нарушений.

**Файлы потока:** `src/domain/types.ts (Warning)`, `src/domain/rules/registry.ts (new)`, `src/domain/rules/contract.test.ts (new)`

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-003 | arch |  | [src/domain/rules/kit.ts:123](../../src/domain/rules/kit.ts#L123) | Контрактные тесты: каждый test() в rules/lrr ссылается на правило реестра, у каждого правила есть тест, у каждого шага есть место показа, src/ui не создаёт нарушений; codesOf перевести на номера правил — P2 note: registry and contract tests done (src/domain/rules/registry.ts, contract.test.ts: every code registered and exercised, src/ui creates no warning; violations carry rule, step, place; rulesOf below); left: «у каждого шага есть место показа» needs warningPlaces by step, for the UI wave | #contract-test | m |  |

<a id="ws-domain-purity"></a>
### Чистота домена · `domain-purity` · волна 0

**Цель.** Домен без случайностей и часов, без геометрии отрисовки, без импорта из UI и без цикла с data.

**Файлы потока:** `src/domain/newGame.ts`, `src/domain/route.ts`, `src/domain/cards.ts`, `src/domain/mapString.test.ts`

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-055 | arch |  | [src/domain/newGame.ts:7](../../src/domain/newGame.ts#L7) | Date.now, Math.random и счётчик модуля в домене: генератор id передавать параметром, как newId в losses.ts | #purity | s |  |
| P2-056 | arch |  | [src/domain/route.ts:4](../../src/domain/route.ts#L4) | Пиксели, кривые, время перелёта и фокус камеры — отрисовка, не правила: перенести в src/ui/map/geometry.ts, в домене оставить слоты и смежность | #purity #geometry | m |  |
| P2-057 | arch |  | [src/domain/cards.ts:1](../../src/domain/cards.ts#L1) | Домен импортирует JSON из src/data, а src/data импортирует домен: набор карт получать через DataPack | #purity #data-cycle | s |  |
| P2-058 | arch |  | [src/domain/mapString.test.ts:3](../../src/domain/mapString.test.ts#L3) | Доменный тест импортирует из UI | #purity #layering | s |  |

<a id="ws-data"></a>
### Игровые данные · `data` · волна 0

**Цель.** В пакетах есть то, что требуют правила: состав набора (96.2), Production базы, уровни Infantry II, War Sun, PDS II, Space Dock II, выходы Излома; с указанием источника.

**Файлы потока:** `scripts/build-data.ts`, `src/data/packs/*.json`, `src/data/provenance.json`

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-050 | data | 96.2, 72.1, 24.4 | [src/domain/types.ts:78](../../src/domain/types.ts#L78) | Лимиты null, хотя LRR 96.2 (tirules2) даёт состав набора: 4 carrier, 8 cruiser, 8 destroyer, 5 dreadnought, 2 war sun, 1 flagship, 4 mech, 3 space dock, 6 PDS | #reinforcements | s |  |
| P2-051 | data | 68.1, 79.1 | [src/domain/types.ts:158](../../src/domain/types.ts#L158) | У базы нет значения Production (ресурсы планеты + 2 у Space Dock I, + 4 у II): без него не проверить лимит производства | #production-value | s |  |
| P2-052 | data | 96.2 | [scripts/build-data.ts:62](../../scripts/build-data.ts#L62) | Заполнить лимиты из LRR 96.2 с указанием источника в provenance.json и docs/data-verification.md | #reinforcements #provenance | s | P2-050 |
| P2-053 | data | 97.1 | [src/domain/unitStats.ts:13](../../src/domain/unitStats.ts#L13) | Улучшения есть только у кораблей: нет Infantry II, у war sun нет второго уровня, нет PDS II и Space Dock II | #unit-upgrade | m |  |
| P2-054 | data | fracture-5 | [src/domain/thundersEdge.ts:27](../../src/domain/thundersEdge.ts#L27) | У тайлов Излома нет данных о выходах (egress), поэтому нечего соединять со входами | #fracture | m |  |

<a id="ws-ui-structure"></a>
### Каталоги UI · `ui-structure` · волна 0

**Цель.** Однородные элементы в тематических каталогах (primitives, feedback, overlays, drawers, plan/editors, plan/blocks); общие примитивы не в фичевых папках.

**Файлы потока:** `src/ui/** (moves only)`

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-211 | arch |  | [src/ui/map/HexStage.tsx:12](../../src/ui/map/HexStage.tsx#L12) | Большой гекс берёт HexRemove, WarningList и warningPlaces из plan/: импортировать из primitives/ и feedback/ после переноса | #imports | s |  |
| P2-231 | arch |  | [src/ui/map/HexMap.tsx:52](../../src/ui/map/HexMap.tsx#L52) | Геометрия группы Излома (fractureFrame, LABEL_*) лежит в файле компонента и импортируется тестом: перенести в geometry.ts | #fracture #geometry | s |  |
| P2-232 | arch |  | [src/ui/map/HexMap.tsx:259](../../src/ui/map/HexMap.tsx#L259) | HexMap держит и камеру, и полоску инструментов, и автомат прилёта Излома (seenPlace, opening, flyRun, leftSeat, flyStyle): вынести хук useFractureFlight, RouteArrows в свой файл | #fracture #srp | m |  |
| P2-234 | arch |  | [src/ui/map/HexMap.tsx:16](../../src/ui/map/HexMap.tsx#L16) | animates берётся из хука жестов: импортировать из common/motion.ts | #motion | s | P2-235 |
| P2-235 | arch |  | [src/ui/map/usePanZoom.ts:21](../../src/ui/map/usePanZoom.ts#L21) | reducedMotion/animates — настройка приложения, а не жест карты (их берут Drawer, SummaryBar, PlanScreen), и сами читают data-energy мимо common/energy.ts: перенести в common/motion.ts | #motion #energy | s |  |
| P2-237 | arch |  | [src/ui/map/Drawer.tsx:2](../../src/ui/map/Drawer.tsx#L2) | Шторка и язычок — общие оверлеи, а лежат в map/ и тянут animates из хука жестов: перенести в overlays/, motion из common/motion.ts | #drawer #overlays | s | P2-235 |
| P2-265 | arch |  | [src/ui/map/UpgradesPanel.tsx:5](../../src/ui/map/UpgradesPanel.tsx#L5) | UnitIcon из players/ и ShipStats из plan/: место в units/ и players/ по новой структуре каталогов | #imports | s |  |
| P2-267 | arch |  | [src/ui/map/ThundersEdgePanel.tsx:3](../../src/ui/map/ThundersEdgePanel.tsx#L3) | ExpeditionWidget и FractureControl живут в plan/, а нужны только этой шторке: перенести в drawers/ вместе с ней | #imports #thunders-edge | s |  |
| P2-272 | arch |  | [src/ui/map/TilePopover.tsx:5](../../src/ui/map/TilePopover.tsx#L5) | HexRemove из plan/RowIcon: импорт из primitives/ после переноса | #imports | s | P2-211 |
| P2-308 | arch |  | [src/ui/plan/tactical.ts:9](../../src/ui/plan/tactical.ts#L9) | systemName нужен всем (WarningText, ExpeditionWidget, редакторы), а живёт в модуле тактики; вынести в ui/names.ts, когда тактика уйдёт в домен | #names | s |  |
| P2-327 | arch |  | [src/ui/plan/StrategyEditor.tsx:25](../../src/ui/plan/StrategyEditor.tsx#L25) | cardPurchases — переходник большого гекса для PlanScreen, к редактору не относится (и тянет тип из map/HexStage); вынести рядом с PurchaseTarget |  | s |  |
| P2-348 | arch |  | [src/ui/plan/EntryList.tsx:51](../../src/ui/plan/EntryList.tsx#L51) | NoteField — примитив поля, спрятан в списке записей (импорт из AdjustmentEditor, GameScreen); в ui/primitives |  | s |  |
| P2-370 | arch |  | [src/ui/plan/ExpeditionWidget.tsx:22](../../src/ui/plan/ExpeditionWidget.tsx#L22) | виджет нужен только map/ThundersEdgePanel; место в drawers/, не в plan/ |  | s |  |
| P2-372 | arch |  | [src/ui/plan/FractureControl.tsx:13](../../src/ui/plan/FractureControl.tsx#L13) | используется только в map/ThundersEdgePanel; в drawers/ |  | s | P2-370 |
| P2-373 | arch |  | [src/ui/plan/FactionCard.tsx:84](../../src/ui/plan/FactionCard.tsx#L84) | FactionCard и FactionComponents нужны только players/PlayerList; перенести в players/ |  | s |  |
| P2-376 | arch |  | [src/ui/plan/ShipStats.tsx:68](../../src/ui/plan/ShipStats.tsx#L68) | ShipStats не относится к плану (FactionCard, map/UpgradesPanel); в players/ |  | s | P2-373 |
| P2-377 | arch |  | [src/ui/plan/RowIcon.tsx:24](../../src/ui/plan/RowIcon.tsx#L24) | HexRemove и RowIcon — общие примитивы в фичевой папке, их импортируют common/, players/, map/; в ui/primitives |  | s |  |
| P2-378 | arch |  | [src/ui/plan/Stepper.tsx:15](../../src/ui/plan/Stepper.tsx#L15) | общий примитив лежит в plan/; в ui/primitives |  | s | P2-377 |
| P2-379 | arch |  | [src/ui/plan/WarningText.tsx:11](../../src/ui/plan/WarningText.tsx#L11) | WarningText, WarningList и warningPlaces нужны и map/HexStage; в ui/feedback |  | s |  |
| P2-382 | arch |  | [src/ui/plan/SummaryBar.tsx:5](../../src/ui/plan/SummaryBar.tsx#L5) | animates — настройка приложения, а берётся из жеста карты; из common/motion.ts |  | s |  |
| P2-412 | arch |  | [src/ui/screens/PlanScreen.tsx:26](../../src/ui/screens/PlanScreen.tsx#L26) | reducedMotion берётся из жеста карты: импортировать из common/motion.ts | #preferences | s | P2-448 |
| P2-413 | arch |  | [src/ui/screens/PlanScreen.tsx:37](../../src/ui/screens/PlanScreen.tsx#L37) | RowIcon из фичевой папки plan/: импортировать из primitives/ | #primitives | s | P2-471 |
| P2-433 | arch |  | [src/ui/screens/PlanScreen.tsx:87](../../src/ui/screens/PlanScreen.tsx#L87) | поле имени плана живёт в экране: перенести к PlanTabs в plan/ |  | s |  |
| P2-434 | arch |  | [src/ui/screens/PlanScreen.tsx:110](../../src/ui/screens/PlanScreen.tsx#L110) | тест этого экрана лежит в plan/PlanScreen.test.tsx: перенести в screens/ | #tests | s |  |
| P2-441 | arch |  | [src/ui/screens/GameScreen.tsx:15](../../src/ui/screens/GameScreen.tsx#L15) | примитив NoteField берётся из списка записей plan/EntryList: вынести в primitives/NoteField.tsx | #primitives | s |  |
| P2-442 | arch |  | [src/ui/screens/GameScreen.tsx:20](../../src/ui/screens/GameScreen.tsx#L20) | HexRemove из фичевой папки plan/: импортировать из primitives/ | #primitives | s | P2-471 |
| P2-444 | arch |  | [src/ui/screens/GameScreen.tsx:32](../../src/ui/screens/GameScreen.tsx#L32) | список языков с подписями живёт в экране: перенести в src/i18n рядом с setLanguage | #i18n | s |  |
| P2-448 | arch |  | [src/ui/common/energy.ts:4](../../src/ui/common/energy.ts#L4) | reducedMotion(), который читает эту настройку вместе с системной, живёт в map/usePanZoom и импортируется в plan/ и screens/: перенести в common/motion.ts | #preferences #motion | s |  |
| P2-451 | arch |  | [src/ui/common/ExportReminder.tsx:5](../../src/ui/common/ExportReminder.tsx#L5) | common зависит от фичевой папки plan/ ради RowIcon: импортировать из primitives/ | #primitives | s | P2-471 |
| P2-455 | arch |  | [src/ui/players/UnitIcon.tsx:4](../../src/ui/players/UnitIcon.tsx#L4) | картинка юнита лежит в players/, а используется в plan/ и map/: перенести в units/UnitIcon.tsx | #units | s |  |
| P2-460 | arch |  | [src/ui/players/FactionPicker.tsx:6](../../src/ui/players/FactionPicker.tsx#L6) | HexRemove из фичевой папки plan/: импортировать из primitives/ | #primitives | s | P2-471 |
| P2-464 | arch |  | [src/ui/players/PlayerList.tsx:7](../../src/ui/players/PlayerList.tsx#L7) | карточка фракции лежит в plan/, а нужна только списку игроков: перенести в players/ вместе с FactionComponents |  | s |  |
| P2-465 | arch |  | [src/ui/players/PlayerList.tsx:9](../../src/ui/players/PlayerList.tsx#L9) | HexRemove из фичевой папки plan/: импортировать из primitives/ | #primitives | s | P2-471 |
| P2-471 | arch |  | [src/ui/App.tsx:10](../../src/ui/App.tsx#L10) | RowIcon и HexRemove — общие примитивы в plan/RowIcon.tsx, их берут App, common, players, screens, map: перенести в primitives/Icon.tsx | #primitives | s |  |
| P2-233 | dup |  | [src/ui/map/HexMap.tsx:23](../../src/ui/map/HexMap.tsx#L23) | RouteDraftView почти совпадает с ArrowPreview из useArrowDrag: один тип черновика маршрута | #route-draft | s |  |
| P2-236 | dup |  | [src/ui/map/useArrowDrag.ts:8](../../src/ui/map/useArrowDrag.ts#L8) | Тот же черновик, что RouteDraftView в HexMap: один тип | #route-draft | s | P2-233 |
| P2-249 | dup |  | [src/ui/map/MapStringImport.tsx:11](../../src/ui/map/MapStringImport.tsx#L11) | Названия дополнений прописаны ещё в GameScreen, FactionComponents и FactionPicker: одно место для всех | #expansions | s |  |
| P2-260 | dup |  | [src/ui/map/UnitShop.tsx:19](../../src/ui/map/UnitShop.tsx#L19) | Вторая копия TokenPicture (первая в units/UnitToken.tsx, там px вместо size): удалить, импортировать из units/ | #token-picture | s |  |
| P2-268 | dup |  | [src/ui/map/opponentName.ts:4](../../src/ui/map/opponentName.ts#L4) | Второй модуль имён игроков рядом с players/factionName.ts: свести в players/names.ts | #player-name | s |  |
| P2-269 | dup |  | [src/ui/map/geometry.ts:5](../../src/ui/map/geometry.ts#L5) | Один из трёх генераторов вершин гекса (ещё FactionCard.tsx и SeatMap.tsx): оставить этот, остальным импортировать | #geometry | s |  |
| P2-270 | dup |  | [src/ui/map/viewLimits.ts:7](../../src/ui/map/viewLimits.ts#L7) | Локальная копия Rect из domain/route (через geometry.ts): импортировать | #geometry | s |  |
| P2-271 | dup |  | [src/ui/map/HexStage.tsx:133](../../src/ui/map/HexStage.tsx#L133) | Имя соперника собирается двумя модулями (opponentName и factionShortName) прямо здесь: одна функция имён в players/names.ts | #player-name | s | P2-268 |
| P2-342 | dup |  | [src/ui/plan/EntrySteps.tsx:45](../../src/ui/plan/EntrySteps.tsx#L45) | язык выводится вручную; currentLanguage() из i18n, как в остальных |  | s |  |
| P2-351 | dup |  | [src/ui/plan/EntryList.tsx:105](../../src/ui/plan/EntryList.tsx#L105) | имя соперника через factionShortName, а opponentName (map/opponentName.ts) даёт полное; два модуля имён игроков, свести в ui/names.ts | #names | s |  |
| P2-375 | dup |  | [src/ui/plan/FactionComponents.tsx:7](../../src/ui/plan/FactionComponents.tsx#L7) | названия дополнений прописаны в четырёх местах (GameScreen, MapStringImport, FactionPicker); одно место |  | s |  |
| P2-426 | dup |  | [src/ui/screens/PlanScreen.tsx:684](../../src/ui/screens/PlanScreen.tsx#L684) | имя соперника «фракция или Игрок N» собрано здесь по seat, а в map/opponentName по index+2: одна функция имени | #names | s | P2-456 |
| P2-431 | dup |  | [src/ui/screens/PlanScreen.tsx:48](../../src/ui/screens/PlanScreen.tsx#L48) | своё правило короткого имени (3 буквы) рядом с factionShortName: короткое имя из одного модуля имён | #names | s | P2-456 |
| P2-435 | dup |  | [src/ui/screens/GameScreen.tsx:26](../../src/ui/screens/GameScreen.tsx#L26) | названия дополнений прописаны здесь, в MapStringImport, FactionComponents и FactionPicker: одна таблица названий | #expansion-names | s |  |
| P2-438 | dup |  | [src/ui/screens/GameScreen.tsx:57](../../src/ui/screens/GameScreen.tsx#L57) | три настройки держат копию в useState и пишутся дважды (setX и setXState): хук usePreference на общей фабрике | #preferences | s | P2-446 |
| P2-440 | dup |  | [src/ui/screens/GameScreen.tsx:38](../../src/ui/screens/GameScreen.tsx#L38) | имя фракции по id через пакет со всеми дополнениями и запасным id в трёх местах экрана: функция из модуля имён | #names | s | P2-456 |
| P2-445 | dup |  | [src/ui/screens/GameScreen.tsx:90](../../src/ui/screens/GameScreen.tsx#L90) | адрес ссылки собирается из window.location здесь и в App: одна функция адреса партии | #share-link | s |  |
| P2-446 | dup |  | [src/ui/common/blur.ts:1](../../src/ui/common/blur.ts#L1) | blur, energy и flightLoop — три копии флага в localStorage с try/catch и записью на корень: одна фабрика preference(key, default, rootAttr?) в common/preferences.ts | #preferences | s |  |
| P2-447 | dup |  | [src/ui/common/energy.ts:1](../../src/ui/common/energy.ts#L1) | копия blur.ts с другим ключом и умолчанием: перейти на фабрику настроек | #preferences | s | P2-446 |
| P2-449 | dup |  | [src/ui/common/flightLoop.ts:1](../../src/ui/common/flightLoop.ts#L1) | та же настройка-флаг, что blur и energy: перейти на фабрику настроек | #preferences | s | P2-446 |
| P2-450 | dup |  | [src/ui/common/ExportReminder.tsx:18](../../src/ui/common/ExportReminder.tsx#L18) | время последней копии читается из localStorage своим try/catch, а пишется в download.ts: та же фабрика с ключом ti4.lastExportAt | #preferences | s | P2-446 |
| P2-454 | dup |  | [src/ui/common/ErrorBoundary.tsx:12](../../src/ui/common/ErrorBoundary.tsx#L12) | баннер ошибки с действием «Экспорт» повторяет saveError в App: общий баннер ошибки с экспортом открытой партии | #banner | s |  |
| P2-456 | dup |  | [src/ui/players/factionName.ts:1](../../src/ui/players/factionName.ts#L1) | два модуля имён игроков: этот и map/opponentName.ts (там номер index+2, в PlanScreen seat): один players/names.ts с полным и коротким именем | #names | s |  |
| P2-458 | dup |  | [src/ui/players/FactionPicker.tsx:39](../../src/ui/players/FactionPicker.tsx#L39) | названия дополнений прописаны строками: брать из общей таблицы названий | #expansion-names | s | P2-435 |
| P2-466 | dup |  | [src/ui/players/SeatMap.tsx:22](../../src/ui/players/SeatMap.tsx#L22) | третий генератор вершин гекса (есть map/geometry.ts и FactionCard): общая функция геометрии | #hex-geometry | s |  |
| P2-468 | dup |  | [src/ui/units/UnitToken.tsx:16](../../src/ui/units/UnitToken.tsx#L16) | TokenPicture определён дважды: здесь (px) и в map/UnitShop.tsx (size): оставить этот, UnitShop и HexStage перевести на него | #token-picture | s |  |

<a id="ws-ui-css"></a>
### Тема · `ui-css` · волна 0

**Цель.** Цвета только переменными, без дублей селекторов и мёртвых правил; общие утилиты.

**Файлы потока:** `src/ui/theme.css`

**Нужно ваше решение или прототип:** P2-503 (decision, prototype)

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-469 | dup |  | [src/ui/units/sprites.ts:5](../../src/ui/units/sprites.ts#L5) | цвета игроков повторяют --player-1..8 из темы и могут разойтись: тест на совпадение с theme.css или чтение CSS-переменных перед выпечкой спрайтов | #player-colour | s |  |
| P2-500 | dup |  | [src/ui/theme.css:102](../../src/ui/theme.css#L102) | scrollbar-width/scrollbar-color повторены 9 раз (103, 171, 207-208, 243, 436, 690, 695, 849, 1012): одна утилита или общее правило для прокручиваемых блоков | #scrollbar | s |  |
| P2-501 | dup |  | [src/ui/theme.css:105](../../src/ui/theme.css#L105) | .app-body > main второй раз, первое правило на 103: слить в одно | #duplicate-selector | s |  |
| P2-510 | dup |  | [src/ui/theme.css:173](../../src/ui/theme.css#L173) | поверхность карточки (surface-2 + border + radius-s) собрана заново в 10 классах: 174, 447, 452, 484, 538, 568, 615, 836, 855, 1016; одна утилита карточки | #card-surface | m |  |
| P2-511 | dup |  | [src/ui/theme.css:177](../../src/ui/theme.css#L177) | подпись small (display:block, text-dim, font-xs) описана 9 раз: 178, 411, 449, 584, 591, 632, 802, 840, 1017; одна утилита подписи | #caption-small | s |  |
| P2-519 | dup |  | [src/ui/theme.css:246](../../src/ui/theme.css#L246) | .stage-panel h3 перебит общим заголовком раздела 959-971: удалить раннее определение | #section-title | s | P2-570 |
| P2-531 | dup |  | [src/ui/theme.css:397](../../src/ui/theme.css#L397) | .map-strip button второй раз подряд, первое на 396: слить | #duplicate-selector | s |  |
| P2-532 | dup |  | [src/ui/theme.css:430](../../src/ui/theme.css#L430) | .hexmap второй раз, первое правило на 290: слить | #duplicate-selector | s |  |
| P2-537 | dup |  | [src/ui/theme.css:495](../../src/ui/theme.css#L495) | .entry-main второй раз (первое 491), .entry-main .entry-handle второй раз (первое 493): слить | #duplicate-selector | s |  |
| P2-540 | dup |  | [src/ui/theme.css:529](../../src/ui/theme.css#L529) | .phase-title перебит общим заголовком раздела 959-971: удалить раннее определение | #section-title | s | P2-570 |
| P2-541 | dup |  | [src/ui/theme.css:551](../../src/ui/theme.css#L551) | .status-points перебит общим заголовком раздела 959-971: удалить раннее определение | #section-title | s | P2-570 |
| P2-543 | dup |  | [src/ui/theme.css:556](../../src/ui/theme.css#L556) | .warning-list второй раз, первое в групповом правиле 445: слить | #duplicate-selector #warning | s |  |
| P2-544 | dup |  | [src/ui/theme.css:561](../../src/ui/theme.css#L561) | .warning-list.place-warnings перебивает display из 560 строкой ниже: свести в одно правило | #duplicate-selector #warning | s |  |
| P2-545 | dup |  | [src/ui/theme.css:571](../../src/ui/theme.css#L571) | .editor-section summary второй раз подряд, первое на 570: слить | #duplicate-selector | s |  |
| P2-546 | dup |  | [src/ui/theme.css:606](../../src/ui/theme.css#L606) | .picker-distance совпадает с .optional-note 605: один класс | #caption-small | s |  |
| P2-547 | dup |  | [src/ui/theme.css:609](../../src/ui/theme.css#L609) | .picker-title перебит общим заголовком раздела 959-971: удалить раннее определение | #section-title | s | P2-570 |
| P2-550 | dup |  | [src/ui/theme.css:681](../../src/ui/theme.css#L681) | стек system-ui… повторён 6 раз вне body: 682, 730, 750, 777, 782, 933; font: inherit или токен --font-family | #font-stack | s |  |
| P2-551 | dup |  | [src/ui/theme.css:697](../../src/ui/theme.css#L697) | .side-label перебит общим заголовком раздела 959-971: удалить раннее определение | #section-title | s | P2-570 |
| P2-552 | dup |  | [src/ui/theme.css:710](../../src/ui/theme.css#L710) | заголовок LayoutPicker собран своим правилом, а не общим заголовком раздела 959: перейти на общий | #section-title | s | P2-570 |
| P2-557 | dup |  | [src/ui/theme.css:741](../../src/ui/theme.css#L741) | .player-sec перебит общим заголовком раздела 959-971: удалить раннее определение | #section-title | s | P2-570 |
| P2-561 | dup |  | [src/ui/theme.css:809](../../src/ui/theme.css#L809) | .plan-body второй раз, первое правило на 428: слить | #duplicate-selector | s |  |
| P2-564 | dup |  | [src/ui/theme.css:878](../../src/ui/theme.css#L878) | .plan-map второй раз, первое правило на 429: слить | #duplicate-selector | s |  |
| P2-565 | dup |  | [src/ui/theme.css:883](../../src/ui/theme.css#L883) | .plan-body третий раз (428, 810): слить в одно | #duplicate-selector | s |  |
| P2-566 | dup |  | [src/ui/theme.css:900](../../src/ui/theme.css#L900) | .drawer-left второй раз, первое правило на 898: слить | #duplicate-selector | s |  |
| P2-567 | dup |  | [src/ui/theme.css:924](../../src/ui/theme.css#L924) | .legend-panel h3 перебит общим заголовком раздела 959-971: удалить раннее определение | #section-title | s | P2-570 |
| P2-569 | dup |  | [src/ui/theme.css:952](../../src/ui/theme.css#L952) | button.hex-button повторяет свойства .hex-button 498-504 ради специфичности: оставить одно правило | #duplicate-selector #hex-button | s |  |
| P2-571 | dup |  | [src/ui/theme.css:974](../../src/ui/theme.css#L974) | .plan-tabs второй и третий раз (первое на 408): слить | #duplicate-selector | s |  |
| P2-572 | dup |  | [src/ui/theme.css:977](../../src/ui/theme.css#L977) | .plan-tab перебивает фон, рамку и радиус из 409, а [aria-selected] на 980 перебивает 410: слить | #duplicate-selector | s |  |
| P2-574 | dup |  | [src/ui/theme.css:998](../../src/ui/theme.css#L998) | выбранная вкладка шторки перебивает .drawer-tab[aria-pressed] 895 и наведение 993-994: оставить одно правило на сторону | #duplicate-selector | s |  |
| P2-575 | dup |  | [src/ui/theme.css:1005](../../src/ui/theme.css#L1005) | .map-strip второй раз, первое правило на 395: слить | #duplicate-selector | s |  |
| P2-576 | dup |  | [src/ui/theme.css:1007](../../src/ui/theme.css#L1007) | .map-tools второй раз, первое правило на 400: слить | #duplicate-selector | s |  |
| P2-254 | dead |  | [src/ui/map/LayoutPicker.tsx:43](../../src/ui/map/LayoutPicker.tsx#L43) | Берёт .panel, а CSS потом снимает с неё всё оформление: убрать класс panel и снимающие правила | #panel | s |  |
| P2-255 | dead |  | [src/ui/map/TileNumberInput.tsx:46](../../src/ui/map/TileNumberInput.tsx#L46) | Тот же .panel, с которого CSS снимает оформление: убрать | #panel | s | P2-254 |
| P2-508 | dead |  | [src/ui/theme.css:164](../../src/ui/theme.css#L164) | .check нигде не используется в src/ui: удалить | #dead-css | s |  |
| P2-509 | dead |  | [src/ui/theme.css:167](../../src/ui/theme.css#L167) | fieldset и legend в разметке нет: удалить оба правила | #dead-css | s |  |
| P2-533 | dead |  | [src/ui/theme.css:454](../../src/ui/theme.css#L454) | .strategy-editor .card-text: класса card-text в разметке нет, удалить | #dead-css | s | P2-534 |
| P2-534 | dead |  | [src/ui/theme.css:466](../../src/ui/theme.css#L466) | .card-text нигде не используется в src/ui: удалить (и 455) | #dead-css | s |  |
| P2-555 | dead |  | [src/ui/theme.css:733](../../src/ui/theme.css#L733) | .icon-button нигде не используется в src/ui: удалить вместе с 705 и 819 | #dead-css | s |  |
| P2-577 | dead |  | [src/ui/theme.css:1024](../../src/ui/theme.css#L1024) | .adjust-system нигде не используется в src/ui: удалить | #dead-css | s |  |
| P2-245 | ui |  | [src/ui/map/MapLegend.tsx:44](../../src/ui/map/MapLegend.tsx#L44) | Цвет точки передаётся style background var(--…): модификатор класса legend-dot-<цвет> в теме | #inline-style #legend | s |  |
| P2-257 | ui |  | [src/ui/map/TileNumberInput.tsx:63](../../src/ui/map/TileNumberInput.tsx#L63) | Ряд подсказок на .row без общего класса, хотя есть .chips: перевести на .chips | #chips | s |  |
| P2-502 | ui |  | [src/ui/theme.css:125](../../src/ui/theme.css#L125) | нет правила button.danger: «Удалить» в GameScreen.tsx:166 выглядит обычной кнопкой; добавить рядом с .primary на var(--danger) | #danger-button | s |  |
| P2-503 | ui |  | [src/ui/theme.css:127](../../src/ui/theme.css#L127) | три цвета «выбрано» для одной роли: голубой здесь, .chip 706, .slice 646, .card-main 462; золотой .option 457, .card-cell 450, .card-abilities 472, .pic-taken 616, .token-tile-on 540, .ship-row-live 838, .upgrade-card.on 857, .entry-upgrades 871, .hex-button:has(checked) 508; зелёный .hex-button[aria-pressed] 1009, .fac-option 1018, вкладки и шторки. Решить по прототипу, какой цвет у переключателей | #selected-state | m |  |
| P2-504 | ui |  | [src/ui/theme.css:128](../../src/ui/theme.css#L128) | #fff вместо переменной, 26 раз: 129, 147, 305, 353, 354, 392, 410, 432, 478, 640, 656-658, 661, 706, 817, 819, 895, 980, 983, 993, 994, 999, 1000, 1018; токен --text-strong (или --accent-text там, где текст на синем) | #colour-token | m |  |
| P2-505 | ui |  | [src/ui/theme.css:146](../../src/ui/theme.css#L146) | рамка при наведении: шесть близких оттенков без переменной: #55617a 147, 154, 619, 658, 819; #66748c 152; #7c8aa3 304; #5d6a83 816; #46536a 814; #465268 785; один токен --border-hover | #colour-token #hover | s |  |
| P2-506 | ui |  | [src/ui/theme.css:148](../../src/ui/theme.css#L148) | #3a7ade (наведение на .primary) без переменной: токен --accent-solid-hover | #colour-token #hover | s |  |
| P2-507 | ui |  | [src/ui/theme.css:150](../../src/ui/theme.css#L150) | #2a3e63 (наведение на выбранное) без переменной, ещё 656: токен --accent-soft-hover | #colour-token #hover | s |  |
| P2-516 | ui |  | [src/ui/theme.css:236](../../src/ui/theme.css#L236) | затемнение фона rgb(6 8 12 / …) без переменной: 237, 265, 904; токен --scrim | #colour-token #scrim | s |  |
| P2-518 | ui |  | [src/ui/theme.css:239](../../src/ui/theme.css#L239) | скругления числами вместо токенов: 14px 240, 1012; 10px 615; 9px 478, 892, 893, 978; на --radius и --radius-s | #radius-token | s |  |
| P2-521 | ui |  | [src/ui/theme.css:263](../../src/ui/theme.css#L263) | var(--warning, #e8a33d): запасной цвет не совпадает с токеном #f0a463, оставить var(--warning) | #colour-token #warning | s |  |
| P2-523 | ui |  | [src/ui/theme.css:282](../../src/ui/theme.css#L282) | #eef1f6 равен --text, ещё 358, 363: заменить на var(--text) | #colour-token | s |  |
| P2-524 | ui |  | [src/ui/theme.css:297](../../src/ui/theme.css#L297) | оттенки карты числами: #293241 298, #1c2a42 и #5a7fb8 310; токены --hex-free-stroke, --hex-path, --hex-path-stroke | #colour-token #map | s |  |
| P2-525 | ui |  | [src/ui/theme.css:307](../../src/ui/theme.css#L307) | #2a2618 (золотой фон выбранного) 8 раз: 308, 450, 457, 472, 616, 838, 857, 871; токен --gold-soft | #colour-token #selected-state | s |  |
| P2-526 | ui |  | [src/ui/theme.css:315](../../src/ui/theme.css#L315) | светло-серый текст пятью близкими числами: #c3cad6 316, #c7cddb 334, #c5cddb 500, #cfd6e2 752, 756, 797; один токен --text-soft | #colour-token | s |  |
| P2-527 | ui |  | [src/ui/theme.css:355](../../src/ui/theme.css#L355) | #0d1016 равен --bg, 9 раз: 357, 360 (×2), 372, 374 (×2), 383, 525, 933; заменить на var(--bg) | #colour-token | s |  |
| P2-528 | ui |  | [src/ui/theme.css:356](../../src/ui/theme.css#L356) | #6a7589 (рамка счётчика юнитов) без переменной, ещё 525: токен --counter-stroke | #colour-token | s |  |
| P2-529 | ui |  | [src/ui/theme.css:364](../../src/ui/theme.css#L364) | #d7deea (нейтральная линия маршрута) без переменной, ещё 510, 625: токен --route-neutral | #colour-token #route | s |  |
| P2-530 | ui |  | [src/ui/theme.css:385](../../src/ui/theme.css#L385) | #12171f (фон бейджа номера) без переменной, ещё 388, 512; почти равен --hex-free: токен --badge-fill | #colour-token #route | s |  |
| P2-535 | ui |  | [src/ui/theme.css:479](../../src/ui/theme.css#L479) | тёмно-золотые заливки числами: #4a3a14 480, #3a3218 508, 990, #4a3f1c 659; токены --gold-fill и --gold-fill-hover | #colour-token | s |  |
| P2-536 | ui |  | [src/ui/theme.css:485](../../src/ui/theme.css#L485) | #141c2a (фон открытой записи) без переменной: токен или color-mix от --accent-soft | #colour-token | s |  |
| P2-538 | ui |  | [src/ui/theme.css:499](../../src/ui/theme.css#L499) | #39445a (рамка гекс-кнопки) без переменной: токен --hex-edge в :root | #colour-token #hex-button | s |  |
| P2-553 | ui |  | [src/ui/theme.css:716](../../src/ui/theme.css#L716) | #4a6490 (рамка своей карточки) без переменной, ещё 815: токен или color-mix от --accent | #colour-token | s |  |
| P2-558 | ui |  | [src/ui/theme.css:784](../../src/ui/theme.css#L784) | поверхности числами: #222b39 785, #222a37 799, #1c2636 818, #28303e 819; заменить на --surface-3 / --accent-soft или завести токены | #colour-token | s |  |
| P2-559 | ui |  | [src/ui/theme.css:798](../../src/ui/theme.css#L798) | тени rgb(0 0 0 / 0.55-0.8) числами при токене --shadow: 490, 799, 880, 898, 908; свести к --shadow и --shadow-drawer | #colour-token #shadow | s |  |
| P2-573 | ui |  | [src/ui/theme.css:988](../../src/ui/theme.css#L988) | #17352a и #d7f5e6 (зелёный выбранного) числами: 989, 1009, 1018; токены --success-soft и --success-ink | #colour-token #selected-state | s |  |

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
| P2-062 | doc | 41-note-6 | [CLAUDE.md:46](../../CLAUDE.md#L46) | Строка противоречит примечанию 6 к LRR 41: +1 за каждый разлом и каждое прохождение | #gravity-rift | s | P2-007 |
| P2-063 | doc | 83.3 | [CLAUDE.md:69](../../CLAUDE.md#L69) | forToken сейчас не выводится, а хранится и устаревает (P2-034) | #for-token | s | P2-034 |
| P2-064 | doc |  | [CLAUDE.md:67](../../CLAUDE.md#L67) | Описать канал нарушений: правило, шаг, место, реестр, контрактные тесты | #warning-channel | s |  |

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
| P2-204 | arch |  | [src/ui/map/HexStage.tsx:139](../../src/ui/map/HexStage.tsx#L139) | Правило «наземные по планетам, числящиеся за системой снимаются первыми» решает UI: перенести в действие стора или домен | #rivals #enemy-units | m |  |
| P2-205 | arch |  | [src/ui/map/HexStage.tsx:169](../../src/ui/map/HexStage.tsx#L169) | Сборка production/productionGround и автооплата (autoPay, если оплата не ручная) считаются в UI: функция домена рядом с withLoss, общая с редактором тактики | #production #payment #duplicate-of-domain | m |  |
| P2-209 | arch |  | [src/ui/map/HexStage.tsx:223](../../src/ui/map/HexStage.tsx#L223) | Есть ли строение в самой партии, а не в записях (game.pds, startingDocks), решает UI: нужна функция домена | #structures | s |  |
| P2-221 | arch |  | [src/ui/map/TileView.tsx:203](../../src/ui/map/TileView.tsx#L203) | Стеки тайла (мои, соперников по replay или по game.enemyUnits, наземные на первой планете, строения) собираются в UI: функция домена stacksOf | #duplicate-of-domain #rivals #stacks | m |  |
| P2-251 | arch |  | [src/ui/map/LayoutPicker.tsx:8](../../src/ui/map/LayoutPicker.tsx#L8) | Какие числа игроков выбирают раскладку и где гиперпути от Milty, решает UI: перенести в domain/mapBuilder.ts | #layout | s |  |
| P2-252 | arch |  | [src/ui/map/LayoutPicker.tsx:39](../../src/ui/map/LayoutPicker.tsx#L39) | Число мест с гиперпутями считается по шаблону в UI: функция в domain/mapBuilder.ts | #layout #hyperlanes | s | P2-251 |
| P2-301 | arch |  | [src/ui/plan/tactical.ts:18](../../src/ui/plan/tactical.ts#L18) | арифметика UnitCounts (hasUnits, withCount, addUnits, countOf) нужна и домену; перенести в src/domain вместе с остальной тактикой |  | s |  |
| P2-302 | arch |  | [src/ui/plan/tactical.ts:36](../../src/ui/plan/tactical.ts#L36) | правки записи (isUntouched, lossesOf, withLoss, withAdjustedUnit) — правила записи тактики и корректировки, не UI; в src/domain/tactical.ts |  | m | P2-300 |
| P2-303 | arch |  | [src/ui/plan/tactical.ts:86](../../src/ui/plan/tactical.ts#L86) | sourcePools и fliesNow решают, откуда что берётся и кто летит сам (fliesNow повторяет fightersFly и ground домена); в src/domain/tactical.ts | #duplicate-of-domain | m |  |
| P2-304 | arch |  | [src/ui/plan/tactical.ts:105](../../src/ui/plan/tactical.ts#L105) | модель ходов тактики (sourcesOf, groupOf, viaOf, withRoute, withoutSource, withUnitCount, withoutEmptySources) живёт в UI, а project.ts группирует ходы тем же sourceSlot; в src/domain/tactical.ts |  | m |  |
| P2-305 | arch |  | [src/ui/plan/tactical.ts:154](../../src/ui/plan/tactical.ts#L154) | arrowsOf и entrySystems выводят из записи стрелки и системы для камеры: чистые функции записи, в src/domain/tactical.ts |  | s |  |
| P2-306 | arch |  | [src/ui/plan/tactical.ts:240](../../src/ui/plan/tactical.ts#L240) | flies и stateInFlight повторяют снятие юнитов и выставление жетона из applyTactical (project.ts); состояние в полёте должен давать домен шагом replay | #duplicate-of-domain | m |  |
| P2-312 | arch |  | [src/ui/plan/TacticalEditor.tsx:67](../../src/ui/plan/TacticalEditor.tsx#L67) | наземные юниты заданы списком; брать pack.units[u].ground |  | s |  |
| P2-313 | arch |  | [src/ui/plan/TacticalEditor.tsx:69](../../src/ui/plan/TacticalEditor.tsx#L69) | что прилетело, что осталось после боя и что можно высадить считает UI; это шаг replay (после перелёта и потерь, до высадки), брать состояние после боя из домена | #duplicate-of-domain | m | P2-312 |
| P2-321 | arch |  | [src/ui/plan/UnitPicker.tsx:62](../../src/ui/plan/UnitPicker.tsx#L62) | «доступно за вычетом других маршрутов» считает UI; в домен рядом с groupOf | #duplicate-of-domain | m | P2-304 |
| P2-359 | arch |  | [src/ui/plan/LandingBlock.tsx:56](../../src/ui/plan/LandingBlock.tsx#L56) | кто остался на планете после потерь считает UI; брать состояние после боя из домена | #duplicate-of-domain | m | P2-313 |
| P2-368 | arch |  | [src/ui/plan/EntryList.tsx:232](../../src/ui/plan/EntryList.tsx#L232) | без plan владельцы частей берутся сырыми game.expedition.slices с приведением типа и без частей из плана; всегда sliceOwners (plan обязателен) |  | s | P2-369 |
| P2-369 | arch |  | [src/ui/plan/ExpeditionWidget.tsx:9](../../src/ui/plan/ExpeditionWidget.tsx#L9) | sliceOwners — правило владения частями экспедиции; в domain/thundersEdge.ts |  | s |  |
| P2-406 | arch |  | [src/ui/screens/PlanScreen.tsx:79](../../src/ui/screens/PlanScreen.tsx#L79) | тела новых записей собраны в экране (здесь и тактическое в onTileTap): фабрика domain/newEntry.ts по типу действия | #new-entry #duplicate-of-domain | s |  |
| P2-409 | arch |  | [src/ui/screens/PlanScreen.tsx:305](../../src/ui/screens/PlanScreen.tsx#L305) | годность системы для Thunder's Edge по слоту решает экран: функция домена от game и слота (validThundersEdgeSystem берёт только тайл) | #thunders-edge #duplicate-of-domain | s |  |
| P2-410 | arch |  | [src/ui/screens/PlanScreen.tsx:34](../../src/ui/screens/PlanScreen.tsx#L34) | владельцы частей экспедиции берутся из виджета plan/: импортировать из domain/thundersEdge.ts после переноса sliceOwners | #thunders-edge | s |  |
| P2-416 | arch | 99, 32, 24 | [src/ui/screens/PlanScreen.tsx:510](../../src/ui/screens/PlanScreen.tsx#L510) | цели карт на карте (Warfare: системы с жетоном; Diplomacy без Mecatol; Construction без жетона до TE; база для dock) считает экран: domain/strategy.ts cardTargets(entry, состояние), здесь только раскраска | #card-targets #duplicate-of-domain | m |  |
| P2-419 | arch |  | [src/ui/screens/PlanScreen.tsx:481](../../src/ui/screens/PlanScreen.tsx#L481) | скорость, шаги и остаток хода считает экран, а IIFE ещё и пишет подсветку побочным эффектом: domain routeHint(draft, before) → {speed, steps, left, reach} | #route-hint | s |  |
| P2-432 | arch |  | [src/ui/screens/PlanScreen.tsx:783](../../src/ui/screens/PlanScreen.tsx#L783) | покупки карты для большого гекса собираются прямо в JSX: cardPurchases из StrategyEditor, cardChange и два одинаковых stateBeforeEntry; обработчик карты в домене или хуке | #card-purchases | s |  |
| P2-439 | arch |  | [src/ui/screens/GameScreen.tsx:109](../../src/ui/screens/GameScreen.tsx#L109) | новый id при совпадении придумывается в экране через Date.now: импорт под свободным id в storage/transfer | #import | s |  |
| P2-457 | arch |  | [src/ui/players/FactionPicker.tsx:9](../../src/ui/players/FactionPicker.tsx#L9) | дополнение фракции выясняется тремя loadPack и вычитанием наборов: дополнение фракции из домена (factionSheet) | #faction-groups | s |  |
| P2-203 | dup |  | [src/ui/map/HexStage.tsx:135](../../src/ui/map/HexStage.tsx#L135) | holderOf повторяет TileView: держателя планеты в состоянии (rivalHolds, затем planetHolder) считать одной функцией домена в players.ts | #duplicate-of-domain #rivals | s |  |
| P2-220 | dup |  | [src/ui/map/TileView.tsx:200](../../src/ui/map/TileView.tsx#L200) | Копия holderOf из HexStage: держатель планеты из функции домена | #duplicate-of-domain #rivals | s | P2-203 |
| P2-258 | dup |  | [src/ui/map/TileNumberInput.tsx:40](../../src/ui/map/TileNumberInput.tsx#L40) | Причину отказа (номер неоднозначен или неизвестен) UI выясняет сам, повторяя поиск: пусть resolveTile в domain/mapBuilder.ts её возвращает | #map-builder | s |  |
| P2-307 | dup |  | [src/ui/plan/tactical.ts:217](../../src/ui/plan/tactical.ts#L217) | выбор пула «планета или космос» по move.from повторён в flightRoutes, flies, stateInFlight и UnitPicker.available; один доменный poolOf |  | s | P2-306 |
| P2-311 | dup |  | [src/ui/plan/TacticalEditor.tsx:58](../../src/ui/plan/TacticalEditor.tsx#L58) | деление «летит / груз» источника считается здесь, в EntrySteps и в tacticalMeters; брать из одной доменной функции | #duplicate-of-domain | m |  |
| P2-343 | dup |  | [src/ui/plan/EntrySteps.tsx:73](../../src/ui/plan/EntrySteps.tsx#L73) | кто летит, кто на борту и где подобран пересчитаны здесь; брать из домена | #duplicate-of-domain | m | P2-311 |
| P2-407 | dup |  | [src/ui/screens/PlanScreen.tsx:342](../../src/ui/screens/PlanScreen.tsx#L342) | тело тактической записи и её владелец по fromCard собираются здесь: брать из domain/newEntry.ts | #new-entry | s | P2-406 |
| P2-417 | dup |  | [src/ui/screens/PlanScreen.tsx:501](../../src/ui/screens/PlanScreen.tsx#L501) | годный источник (система с доступными юнитами) считается здесь и в startsArrow одинаково: одна функция домена над состоянием перед записью | #valid-sources | s |  |
| P2-418 | dup |  | [src/ui/screens/PlanScreen.tsx:529](../../src/ui/screens/PlanScreen.tsx#L529) | та же проверка годного источника, что в подсветке выбора: взять функцию домена | #valid-sources | s | P2-417 |
| P2-470 | dup |  | [src/ui/units/unitOrder.ts:3](../../src/ui/units/unitOrder.ts#L3) | порядок юнитов повторяет ORDER из domain/hexLayout.ts: экспортировать из домена и брать оттуда | #duplicate-of-domain | s |  |

<a id="ws-ui-warnings"></a>
### Показ нарушений · `ui-warnings` · волна 1

**Цель.** Все нарушения показывает WarningList; раскладка по шагу и месту из домена, не по коду; остаток вверху редактора.

**Опирается на:** `rule-engine`

**Файлы потока:** `src/ui/plan/WarningText.tsx`, `src/ui/plan/warningPlaces.ts`

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-315 | arch |  | [src/ui/plan/TacticalEditor.tsx:97](../../src/ui/plan/TacticalEditor.tsx#L97) | места предупреждений перелёта и боя решаются фильтрами по коду и params.where (pickerWarnings, battleWarnings); нужны шаг и место из домена (WarningPlace 'battle'), а не разбор кода в редакторе |  | m |  |
| P2-324 | arch |  | [src/ui/plan/UnitPicker.tsx:166](../../src/ui/plan/UnitPicker.tsx#L166) | предупреждения делятся по коду прямо в разметке (capacityGroup у груза, остальное внизу); раскладку давать placeWarnings |  | s | P2-315 |
| P2-381 | arch |  | [src/ui/plan/warningPlaces.ts:7](../../src/ui/plan/warningPlaces.ts#L7) | место предупреждения выводится из кода таблицей в UI; брать шаг и место из доменного нарушения, таблицу удалить |  | m |  |
| P2-210 | dup |  | [src/ui/map/HexStage.tsx:325](../../src/ui/map/HexStage.tsx#L325) | Перебор ресурсов, флота и вместимости решает сам (over, класс stage-meter-over): красить счётчики по кодам shortResources/fleetPool/capacitySystem записи | #warning-channel #duplicate-of-domain | m |  |
| P2-216 | dup |  | [src/ui/map/HexStage.tsx:429](../../src/ui/map/HexStage.tsx#L429) | «Нет базы» считает UI (вторая копия в TacticalEditor) и рисует p.warning-text: доменный код нарушения через WarningList | #warning-channel #duplicate-of-domain | s |  |
| P2-212 | ui |  | [src/ui/map/HexStage.tsx:385](../../src/ui/map/HexStage.tsx#L385) | Пояснение к нажатию свёрстано как p.warning-text: показать через WarningList с произвольным текстом (message) | #warning-channel | s |  |
| P2-310 | ui |  | [src/ui/plan/TacticalEditor.tsx:174](../../src/ui/plan/TacticalEditor.tsx#L174) | своё span.warning-text мимо WarningList; показывать noProduction через placer.at('production') | #warning-channel | s | P2-309 |
| P2-344 | ui |  | [src/ui/plan/EntrySteps.tsx:98](../../src/ui/plan/EntrySteps.tsx#L98) | «никто не летит» и «перегруз» (ниже) — свои span.warning-text по tacticalMeters; показывать коды записи (unitsMissing, capacityGroup) через WarningList | #warning-channel | m |  |
| P2-345 | ui |  | [src/ui/plan/EntrySteps.tsx:114](../../src/ui/plan/EntrySteps.tsx#L114) | перегруз из tacticalMeters дублирует capacityGroup |  | s | P2-344 |
| P2-354 | ui |  | [src/ui/plan/EntryList.tsx:214](../../src/ui/plan/EntryList.tsx#L214) | своя ul.warning-list мимо WarningList; WarningList variant="row" | #warning-channel | s |  |
| P2-363 | ui |  | [src/ui/plan/AdjustmentEditor.tsx:71](../../src/ui/plan/AdjustmentEditor.tsx#L71) | все предупреждения в блоке «Система»; placeWarnings по местам и остаток вверху редактора |  | s |  |
| P2-367 | ui |  | [src/ui/plan/ExpeditionEditor.tsx:59](../../src/ui/plan/ExpeditionEditor.tsx#L59) | остаток предупреждений стоит у выбора части; по CLAUDE.md — вверху редактора |  | s |  |
| P2-380 | ui |  | [src/ui/plan/WarningText.tsx:39](../../src/ui/plan/WarningText.tsx#L39) | нет варианта «в строке» и произвольного текста, поэтому EntryList, HexStage, ShareConflict собирают своё; добавить variant и message | #warning-channel | m |  |
| P2-453 | ui |  | [src/ui/common/ShareConflict.tsx:21](../../src/ui/common/ShareConflict.tsx#L21) | предупреждение собрано классами warning-text place-warnings: WarningList с произвольным текстом | #warning-channel | s |  |

<a id="ws-ui-containers"></a>
### Контейнеры визуального языка · `ui-containers` · волна 1

**Цель.** Section, SectionTitle, PlayerDot, PlayerChoice, UnitTile, ConfirmBar, Modal, DrawerSheet, Popover, MapPickButton вместо ручных сборок.

**Опирается на:** `ui-structure`

**Файлы потока:** `src/ui/primitives/*`, `src/ui/overlays/*`

**Нужно ваше решение или прототип:** P2-243 (prototype), P2-250 (prototype), P2-253 (prototype), P2-261 (prototype), P2-264 (prototype), P2-247 (prototype), P2-319 (prototype), P2-323 (prototype), P2-329 (prototype), P2-332 (prototype), P2-334 (prototype), P2-340 (prototype), P2-362 (prototype), P2-371 (prototype), P2-383 (prototype), P2-427 (prototype), P2-436 (prototype)

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-259 | arch |  | [src/ui/map/TilePopover.tsx:18](../../src/ui/map/TilePopover.tsx#L18) | Поповер привязан только к гексу (ищет [data-slot] polygon): общий Popover с якорем в overlays/, его же взять для .map-import | #popover #overlays | m |  |
| P2-356 | arch |  | [src/ui/plan/ExpeditionEditor.tsx:28](../../src/ui/plan/ExpeditionEditor.tsx#L28) | флаг ручной оплаты хранится здесь, а TacticalEditor и StrategyEditor получают его от PlanScreen; одно место для всех PaymentBlock |  | s |  |
| P2-202 | dup |  | [src/ui/map/HexStage.tsx:109](../../src/ui/map/HexStage.tsx#L109) | Свой обработчик Escape, как в Drawer и FactionPicker: его возьмёт на себя Modal | #modal | s | P2-201 |
| P2-208 | dup |  | [src/ui/map/HexStage.tsx:287](../../src/ui/map/HexStage.tsx#L287) | Кнопка потери .stage-loss — ещё одна плитка юнита с числом: UnitTile variant="loss" | #unit-tile | s | P2-261 |
| P2-226 | dup |  | [src/ui/map/TileView.tsx:327](../../src/ui/map/TileView.tsx#L327) | SVG жетона приказа повторён здесь, у жетонов соперников ниже и в MapLegend: один компонент CommandTokenMark с цветом игрока | #command-token #svg | s |  |
| P2-227 | dup |  | [src/ui/map/TileView.tsx:343](../../src/ui/map/TileView.tsx#L343) | Метка ingress нарисована здесь и в MapLegend отдельно: один компонент IngressMark | #ingress #svg | s |  |
| P2-230 | dup |  | [src/ui/map/HexMap.tsx:139](../../src/ui/map/HexMap.tsx#L139) | Вершины бейджа и выреза заданы строками, хотя это hexPoints(10.5) и hexPoints(15); бейдж номера и метка «+N» повторены в MapLegend и OrderHex в EntryList: общий компонент RouteBadge | #route-badge #svg | s |  |
| P2-239 | dup |  | [src/ui/map/MapLegend.tsx:58](../../src/ui/map/MapLegend.tsx#L58) | Свой aside role=dialog с h2: DrawerSheet | #drawer-sheet | s | P2-238 |
| P2-240 | dup |  | [src/ui/map/MapLegend.tsx:105](../../src/ui/map/MapLegend.tsx#L105) | Значок места свёрстан заново с жёстким var(--player-2) во style: тот же значок, что на тайле | #player-colour #inline-style #legend | s | P2-224 |
| P2-241 | dup |  | [src/ui/map/MapLegend.tsx:101](../../src/ui/map/MapLegend.tsx#L101) | Копия SVG жетона приказа из TileView: CommandTokenMark | #command-token #svg | s | P2-226 |
| P2-242 | dup |  | [src/ui/map/MapLegend.tsx:103](../../src/ui/map/MapLegend.tsx#L103) | Копия метки ingress из TileView: IngressMark | #ingress #svg | s | P2-227 |
| P2-243 | dup |  | [src/ui/map/MapLegend.tsx:29](../../src/ui/map/MapLegend.tsx#L29) | Своя планета легенды вместо PlanetMark из TileView: легенда расходится с картой; рисовать PlanetMark | #legend #planet | s |  |
| P2-244 | dup |  | [src/ui/map/MapLegend.tsx:9](../../src/ui/map/MapLegend.tsx#L9) | Копии вершин гекса и бейджа из HexMap: брать hexPoints и RouteBadge | #route-badge #svg | s | P2-230 |
| P2-246 | dup |  | [src/ui/map/MapLegend.tsx:117](../../src/ui/map/MapLegend.tsx#L117) | Метка подбора «+N» свёрстана заново, как в RouteArrows: общий компонент | #route-badge #svg | s | P2-230 |
| P2-248 | dup |  | [src/ui/map/MapStringImport.tsx:42](../../src/ui/map/MapStringImport.tsx#L42) | Плавающая карточка .map-import повторяет .tile-popover, а panel-head собран руками: Popover с якорем и Section | #popover #section | m | P2-259 |
| P2-250 | dup |  | [src/ui/map/MapStringImport.tsx:61](../../src/ui/map/MapStringImport.tsx#L61) | Строка подтверждения .row (текст, «Заменить», «Отмена») — четвёртый вид после player-confirm, GameScreen и LayoutPicker: ConfirmBar | #confirm-bar | s |  |
| P2-253 | dup |  | [src/ui/map/LayoutPicker.tsx:61](../../src/ui/map/LayoutPicker.tsx#L61) | Строка подтверждения .row собрана руками: ConfirmBar | #confirm-bar | s | P2-250 |
| P2-261 | dup |  | [src/ui/map/UnitShop.tsx:34](../../src/ui/map/UnitShop.tsx#L34) | Ячейка .shop-item — одна из пяти плиток юнита с числом (UnitButton, .stage-loss, UnitPictures, Stack): UnitTile с вариантами take/taken/loss/shop | #unit-tile | m |  |
| P2-263 | dup |  | [src/ui/map/UpgradesPanel.tsx:24](../../src/ui/map/UpgradesPanel.tsx#L24) | Свой aside role=dialog с h2: DrawerSheet | #drawer-sheet | s | P2-238 |
| P2-264 | dup |  | [src/ui/map/UpgradesPanel.tsx:38](../../src/ui/map/UpgradesPanel.tsx#L38) | Переключатель улучшения .upgrade-card повторяет .ship-row-live из ShipStats: один вид | #upgrade-toggle | s |  |
| P2-266 | dup |  | [src/ui/map/ThundersEdgePanel.tsx:20](../../src/ui/map/ThundersEdgePanel.tsx#L20) | Свой aside role=dialog с h2: DrawerSheet | #drawer-sheet | s | P2-238 |
| P2-314 | dup |  | [src/ui/plan/TacticalEditor.tsx:53](../../src/ui/plan/TacticalEditor.tsx#L53) | строка «юнит N, …» собрана здесь, в StrategyEditor (builtUnits), AdjustmentEditor и EntrySteps (signed); один помощник unitsText в ui/units |  | s |  |
| P2-335 | dup |  | [src/ui/plan/StrategyEditor.tsx:360](../../src/ui/plan/StrategyEditor.tsx#L360) | сетка карт стратегии повторяет StrategyCards.tsx; общий CardGrid |  | s |  |
| P2-347 | dup |  | [src/ui/plan/EntrySteps.tsx:181](../../src/ui/plan/EntrySteps.tsx#L181) | копия signed из AdjustmentEditor |  | s | P2-314 |
| P2-352 | dup |  | [src/ui/plan/EntryList.tsx:134](../../src/ui/plan/EntryList.tsx#L134) | бейдж номера нарисован третий раз (HexMap, MapLegend); один компонент |  | s |  |
| P2-364 | dup |  | [src/ui/plan/AdjustmentEditor.tsx:32](../../src/ui/plan/AdjustmentEditor.tsx#L32) | signed повторён в EntrySteps |  | s | P2-314 |
| P2-374 | dup |  | [src/ui/plan/FactionCard.tsx:10](../../src/ui/plan/FactionCard.tsx#L10) | третий генератор вершин гекса (map/geometry.ts, SeatMap.tsx); брать из map/geometry |  | s |  |
| P2-384 | dup |  | [src/ui/plan/StrategyCards.tsx:61](../../src/ui/plan/StrategyCards.tsx#L61) | та же сетка карт, что в StrategyEditor |  | s | P2-335 |
| P2-512 | dup |  | [src/ui/theme.css:179](../../src/ui/theme.css#L179) | маленькая кнопка: 14 контекстных переопределений padding/min-height/font-size: 180, 226, 251, 398, 401, 418, 433, 440, 547, 576, 636, 701, 712, 739; модификатор .small или проп у кнопки | #small-button | m |  |
| P2-513 | dup |  | [src/ui/theme.css:198](../../src/ui/theme.css#L198) | плавающая карточка: .tile-popover и .map-import 680 одинаковы (surface-3, border-strong, radius, shadow, pop-in); общий Popover | #floating-card #popover | m |  |
| P2-515 | dup |  | [src/ui/theme.css:228](../../src/ui/theme.css#L228) | кружок игрока собран в 6 классах: .owner-dot, .status-player ::before 554, .player-badge 723, .seat-ghost-badge 805, .legend-dot 932, .legend-seat 933; компонент PlayerDot с размером | #player-dot | m |  |
| P2-517 | dup |  | [src/ui/theme.css:238](../../src/ui/theme.css#L238) | коробка модала трижды: .stage-dialog, .link-dialog 603, .fac-sheet 1012, скругления 14px и var(--radius) вперемешку; общий Modal | #modal | m |  |
| P2-520 | dup |  | [src/ui/theme.css:253](../../src/ui/theme.css#L253) | .shop-item (84px) ещё одна плитка юнита с числом: перейти на общий UnitTile | #unit-tile | s | P2-548 |
| P2-522 | dup |  | [src/ui/theme.css:267](../../src/ui/theme.css#L267) | .stage-loss (62px) ещё одна плитка юнита с числом: перейти на общий UnitTile | #unit-tile | s | P2-548 |
| P2-539 | dup |  | [src/ui/theme.css:523](../../src/ui/theme.css#L523) | .upic (32px) ещё одна плитка юнита с числом, бейдж i повторяет .pic i: перейти на общий UnitTile | #unit-tile | s | P2-548 |
| P2-542 | dup |  | [src/ui/theme.css:553](../../src/ui/theme.css#L553) | кружок игрока через ::before: перейти на PlayerDot | #player-dot | s | P2-515 |
| P2-548 | dup |  | [src/ui/theme.css:614](../../src/ui/theme.css#L614) | плитка юнита с числом: 4 класса (.pic, .shop-item 254, .stage-loss 268, .upic 524) и 5 компонентов, размеры 62/84/62/32, бейдж числа 257, 270, 617, 525; общий UnitTile с размером, радиус var(--radius-s) вместо 10px | #unit-tile | m |  |
| P2-549 | dup |  | [src/ui/theme.css:679](../../src/ui/theme.css#L679) | .map-import повторяет .tile-popover: перейти на общий Popover | #floating-card | s | P2-513 |
| P2-554 | dup |  | [src/ui/theme.css:722](../../src/ui/theme.css#L722) | .player-badge: кружок игрока большого размера, перейти на PlayerDot | #player-dot | s | P2-515 |
| P2-556 | dup |  | [src/ui/theme.css:735](../../src/ui/theme.css#L735) | строка подтверждения: .player-confirm, строка сохранения GameScreen:163, .row в LayoutPicker и MapStringImport; общий ConfirmBar | #confirm-bar | m |  |
| P2-560 | dup |  | [src/ui/theme.css:804](../../src/ui/theme.css#L804) | .seat-ghost-badge: кружок игрока, перейти на PlayerDot | #player-dot | s | P2-515 |
| P2-562 | dup |  | [src/ui/theme.css:835](../../src/ui/theme.css#L835) | переключатель улучшения дважды: .ship-row-live и .upgrade-card 855 (рамка, gold при выборе, disabled без затухания); один компонент | #upgrade-toggle | m |  |
| P2-563 | dup |  | [src/ui/theme.css:854](../../src/ui/theme.css#L854) | .upgrade-card повторяет .ship-row-live 836: перейти на общий переключатель | #upgrade-toggle | s | P2-562 |
| P2-568 | dup |  | [src/ui/theme.css:931](../../src/ui/theme.css#L931) | .legend-dot и .legend-seat 933: кружок игрока, перейти на PlayerDot | #player-dot | s | P2-515 |
| P2-570 | dup |  | [src/ui/theme.css:958](../../src/ui/theme.css#L958) | заголовок раздела: общее правило для 8 классов, а ранние определения 247, 530, 552, 610, 698, 742, 925 перебиты и мертвы, LayoutPicker 711 сам по себе; компонент SectionTitle с одним классом | #section-title | m |  |
| P2-201 | ui |  | [src/ui/map/HexStage.tsx:359](../../src/ui/map/HexStage.tsx#L359) | Модал собран руками (.stage + .stage-dialog, без портала), третья копия после FactionPicker и ShareConflict: Modal с title, onClose и HexRemove | #modal | m |  |
| P2-213 | ui |  | [src/ui/map/HexStage.tsx:398](../../src/ui/map/HexStage.tsx#L398) | Выбор игрока точкой и именем собран руками, цвет через var(--player-N) во style: PlayerChoice с PlayerDot | #player-colour #inline-style #rivals | m |  |
| P2-214 | ui |  | [src/ui/map/HexStage.tsx:448](../../src/ui/map/HexStage.tsx#L448) | Вторая ручная сборка выбора игрока (контроль планеты) с цветом во style: PlayerChoice с вариантом «Нет» | #player-colour #inline-style | s | P2-213 |
| P2-215 | ui |  | [src/ui/map/HexStage.tsx:409](../../src/ui/map/HexStage.tsx#L409) | Голые h3 здесь и в lossStrip, уровни заголовков произвольные: SectionTitle | #section-title | s |  |
| P2-223 | ui |  | [src/ui/map/TileView.tsx:129](../../src/ui/map/TileView.tsx#L129) | Цвет игрока через var(--player-N) во style (здесь, у места, у жетонов, в HexMap, UpgradesPanel): playerVar() или data-player с правилом в теме | #player-colour #inline-style | m |  |
| P2-224 | ui |  | [src/ui/map/TileView.tsx:316](../../src/ui/map/TileView.tsx#L316) | Значок места красится style fill var(--player-N): playerVar() или data-player; тот же значок нужен легенде | #player-colour #inline-style | s | P2-223 |
| P2-225 | ui |  | [src/ui/map/TileView.tsx:335](../../src/ui/map/TileView.tsx#L335) | Жетон соперника красится style fill var(--player-N): playerVar() или data-player | #player-colour #inline-style #rivals | s | P2-223 |
| P2-228 | ui |  | [src/ui/map/HexMap.tsx:175](../../src/ui/map/HexMap.tsx#L175) | Цвет стрелки соперника через style --route: var(--player-N): data-player или playerVar() | #player-colour #inline-style #rivals | s | P2-223 |
| P2-229 | ui |  | [src/ui/map/HexMap.tsx:188](../../src/ui/map/HexMap.tsx#L188) | Бейдж повторяет style --route стрелки: data-player или playerVar() | #player-colour #inline-style #rivals | s | P2-223 |
| P2-238 | ui |  | [src/ui/map/Drawer.tsx:31](../../src/ui/map/Drawer.tsx#L31) | Шторка даёт только коробку: каждое содержимое (легенда, улучшения, Thunder's Edge, игроки) собирает свой aside с role=dialog и h2; добавить DrawerSheet с title | #drawer #drawer-sheet | m |  |
| P2-247 | ui |  | [src/ui/map/MapStringImport.tsx:47](../../src/ui/map/MapStringImport.tsx#L47) | Текстовая кнопка «Закрыть»: HexRemove, как везде | #close-button | s |  |
| P2-256 | ui |  | [src/ui/map/TileNumberInput.tsx:61](../../src/ui/map/TileNumberInput.tsx#L61) | Разметка баннера руками (p.banner.banner-warning): Banner kind="warning" | #banner | s |  |
| P2-262 | ui |  | [src/ui/map/UpgradesPanel.tsx:23](../../src/ui/map/UpgradesPanel.tsx#L23) | style --player: var(--player-N): data-player или playerVar() | #player-colour #inline-style | s | P2-223 |
| P2-316 | ui |  | [src/ui/plan/TacticalEditor.tsx:106](../../src/ui/plan/TacticalEditor.tsx#L106) | блоки редактора собраны руками (div.editor-section > strong, optional-note только здесь); Section(title, optional, action, warnings) во всех редакторах | #section | m |  |
| P2-319 | ui |  | [src/ui/plan/TacticalEditor.tsx:199](../../src/ui/plan/TacticalEditor.tsx#L199) | голова и подвал редакторов четырёх видов (здесь panel-head и «Готово» вверху, у StrategyEditor h2 и подвал, у UnitPicker текстовое «Закрыть»); класса .tactical-editor в CSS нет. Одна рамка редактора | #editor-frame | m |  |
| P2-320 | ui |  | [src/ui/plan/UnitPicker.tsx:40](../../src/ui/plan/UnitPicker.tsx#L40) | плитка юнита с числом: UnitButton, Stack (LandingBlock), UnitPictures (EntrySteps), плитки HexStage и UnitShop — разные компоненты и классы; один UnitTile с вариантами take/taken/loss/shop в ui/units | #unit-tile | m |  |
| P2-323 | ui |  | [src/ui/plan/UnitPicker.tsx:128](../../src/ui/plan/UnitPicker.tsx#L128) | текстовое «Закрыть» вместо HexRemove; «Удалить источник» в подвале повторяет крестик строки источника |  | m | P2-319 |
| P2-325 | ui |  | [src/ui/plan/UnitPicker.tsx:133](../../src/ui/plan/UnitPicker.tsx#L133) | заголовки подблоков h4.picker-title вручную; SectionTitle |  | s |  |
| P2-329 | ui |  | [src/ui/plan/StrategyEditor.tsx:178](../../src/ui/plan/StrategyEditor.tsx#L178) | выбор игрока (точка цвета + имя, inline var(--player-…)) собран руками здесь, в Trade ниже, в HexStage и PlanScreen; общий PlayerChoice с PlayerDot | #player-choice | m |  |
| P2-330 | ui |  | [src/ui/plan/StrategyEditor.tsx:219](../../src/ui/plan/StrategyEditor.tsx#L219) | вторая ручная сборка выбора игрока; PlayerChoice | #player-choice | s | P2-329, P2-328 |
| P2-332 | ui |  | [src/ui/plan/StrategyEditor.tsx:289](../../src/ui/plan/StrategyEditor.tsx#L289) | «−» на месте .in-card, где по соглашению удаление, а делает уменьшение; Stepper |  | s |  |
| P2-334 | ui |  | [src/ui/plan/StrategyEditor.tsx:358](../../src/ui/plan/StrategyEditor.tsx#L358) | голый h2 и подвал .strategy-foot вместо общей рамки редактора |  | m | P2-319 |
| P2-338 | ui |  | [src/ui/plan/StrategyEditor.tsx:98](../../src/ui/plan/StrategyEditor.tsx#L98) | блоки (жетоны, Diplomacy, Politics, Trade, Technology, улучшения) собраны вручную из div.editor-section; Section | #section | m | P2-316 |
| P2-340 | ui |  | [src/ui/plan/TokenTiles.tsx:48](../../src/ui/plan/TokenTiles.tsx#L48) | ещё один вид «−»; Stepper |  | s | P2-332 |
| P2-341 | ui |  | [src/ui/plan/EntrySteps.tsx:16](../../src/ui/plan/EntrySteps.tsx#L16) | своя плитка юнита (.upic); UnitTile | #unit-tile | m | P2-320 |
| P2-350 | ui |  | [src/ui/plan/EntryList.tsx:84](../../src/ui/plan/EntryList.tsx#L84) | цвет игрока inline-стилем var(--player-…) в .status-player ниже; PlayerDot / data-player / playerVar() |  | s |  |
| P2-353 | ui |  | [src/ui/plan/EntryList.tsx:193](../../src/ui/plan/EntryList.tsx#L193) | --owner inline-стилем var(--player-…) у строки ниже; data-player / playerVar() |  | s | P2-350 |
| P2-358 | ui |  | [src/ui/plan/LandingBlock.tsx:7](../../src/ui/plan/LandingBlock.tsx#L7) | плитка юнита берётся из файла перелёта, а Stack ниже — ещё одна плитка; обе заменить UnitTile | #unit-tile | m | P2-320 |
| P2-361 | ui |  | [src/ui/plan/PaymentBlock.tsx:40](../../src/ui/plan/PaymentBlock.tsx#L40) | блок собран вручную (editor-section + panel-head); Section с action | #section | m | P2-316 |
| P2-362 | ui |  | [src/ui/plan/AdjustmentEditor.tsx:39](../../src/ui/plan/AdjustmentEditor.tsx#L39) | чужой класс .tactical-editor (которого нет в CSS), своя голова и ручные блоки; общая рамка редактора и Section |  | m | P2-319, P2-316 |
| P2-371 | ui |  | [src/ui/plan/ExpeditionWidget.tsx:66](../../src/ui/plan/ExpeditionWidget.tsx#L66) | текстовое «Убрать» вместо HexRemove |  | m | P2-323 |
| P2-383 | ui |  | [src/ui/plan/PlanTabs.tsx:72](../../src/ui/plan/PlanTabs.tsx#L72) | удаление плана текстовой кнопкой и раунда «−» ниже вместо HexRemove |  | m |  |
| P2-385 | ui |  | [src/ui/plan/EntryUpgrades.tsx:20](../../src/ui/plan/EntryUpgrades.tsx#L20) | --player inline-стилем у корня; data-player / playerVar() |  | s | P2-350 |
| P2-425 | ui |  | [src/ui/screens/PlanScreen.tsx:683](../../src/ui/screens/PlanScreen.tsx#L683) | плашка «действие за» красит край и точку inline-стилем var(--player-N): PlayerDot и playerVar()/data-player (аудит 3.7) | #player-colour #inline-style | s |  |
| P2-427 | ui |  | [src/ui/screens/PlanScreen.tsx:691](../../src/ui/screens/PlanScreen.tsx#L691) | своя голова редактора с текстовой «Отмена» вместо общей головы редактора и HexRemove (аудит 3.3, 3.4) | #editor-head | s |  |
| P2-430 | ui |  | [src/ui/screens/PlanScreen.tsx:754](../../src/ui/screens/PlanScreen.tsx#L754) | выбор «за кого» занимает класс большого гекса stage-owners и красит кнопки inline-стилем: PlayerChoice (аудит 3.6) | #player-colour #player-choice | s | P2-425 |
| P2-436 | ui |  | [src/ui/screens/GameScreen.tsx:172](../../src/ui/screens/GameScreen.tsx#L172) | своя строка подтверждения удаления, ещё один вид рядом с .player-confirm и строками LayoutPicker/MapStringImport: общий ConfirmBar | #confirm-bar | s |  |
| P2-437 | ui |  | [src/ui/screens/GameScreen.tsx:176](../../src/ui/screens/GameScreen.tsx#L176) | класс .danger не описан в теме, «Удалить» выглядит обычной кнопкой: вариант danger у ConfirmBar | #confirm-bar #danger | s | P2-436 |
| P2-443 | ui |  | [src/ui/screens/GameScreen.tsx:138](../../src/ui/screens/GameScreen.tsx#L138) | заголовки групп «Партии» — p.side-label, в других местах h2/h3/strong для того же вида: SectionTitle | #section-title | s |  |
| P2-452 | ui |  | [src/ui/common/ShareConflict.tsx:11](../../src/ui/common/ShareConflict.tsx#L11) | модал собран руками (.stage + .link-dialog) без Escape и шапки с HexRemove, третья копия рядом с HexStage и FactionPicker: общий Modal (аудит 3.5) | #modal | s |  |
| P2-459 | ui |  | [src/ui/players/FactionPicker.tsx:56](../../src/ui/players/FactionPicker.tsx#L56) | модал с порталом, Escape и шапкой собран руками: общий Modal | #modal | s | P2-452 |
| P2-461 | ui |  | [src/ui/players/PlayerList.tsx:68](../../src/ui/players/PlayerList.tsx#L68) | своя строка подтверждения .player-confirm: общий ConfirmBar | #confirm-bar | s | P2-436 |
| P2-462 | ui |  | [src/ui/players/PlayerList.tsx:101](../../src/ui/players/PlayerList.tsx#L101) | цвет игрока --player задаётся inline-стилем: data-player/playerVar() | #player-colour #inline-style | s | P2-425 |
| P2-463 | ui |  | [src/ui/players/PlayerList.tsx:86](../../src/ui/players/PlayerList.tsx#L86) | h1 в списке, который стоит и в шторке, рядом с h2 других шторок: заголовок от DrawerSheet/SectionTitle | #section-title #drawer-sheet | s |  |
| P2-467 | ui |  | [src/ui/players/SeatMap.tsx:100](../../src/ui/players/SeatMap.tsx#L100) | цвет игрока inline-стилем здесь и у значка призрака: data-player/playerVar() | #player-colour #inline-style | s | P2-425 |
| P2-514 | ui |  | [src/ui/theme.css:218](../../src/ui/theme.css#L218) | .panel берут и тут же снимают с неё всё оформление (ещё .players-aside .layout-picker 709): LayoutPicker и TileNumberInput без .panel или с вариантом | #panel-reset | s |  |

<a id="ws-command-tokens"></a>
### Жетоны приказа и активация · `command-tokens` · волна 2

**Цель.** Активация (89.1), тактический резерв (20.4), 16 жетонов (20.3), жетон в систему со своим жетоном (20.6), сжатие резерва флота (37.3, 81.5.1).

**Опирается на:** `replay-steps`

**Файлы потока:** `src/domain/project.ts (activation, statusTokens)`

**Нужно ваше решение или прототип:** P2-016 (decision)

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-018 | bug | 20.6 | [src/domain/replay/cards.ts:50](../../src/domain/replay/cards.ts#L50) | Второстепенное Construction в систему с моим жетоном законно (жетон уходит в снабжение), а здесь предупреждение | #construction | s |  |
| P2-015 | check | 5.2, 89.1, 20.4 | [src/domain/replay/activation.ts:6](../../src/domain/replay/activation.ts#L6) | Активация системы со своим жетоном и тактика без жетона в тактическом резерве проходят молча: нарушения systemHasToken и poolNegative(tactic) | #activation | s |  |
| P2-017 | check | 81.5, 37.3 | [src/domain/replay/status.ts:13](../../src/domain/replay/status.ts#L13) | Перераспределение не проверяет минус в резерве и флот меньше кораблей в системах (после статуса и после перестановки Warfare): poolNegative и fleetPool по всем системам | #fleet-pool #redistribute | s |  |
| P2-016 | model | 20.3, 23.2 | [src/domain/replay/status.ts:7](../../src/domain/replay/status.ts#L7) | Жетонов приказа 16: сумма в резервах и на карте не ограничена. Нужна модель снабжения жетонов (решить, нужна ли) | #token-supply | m |  |

<a id="ws-movement"></a>
### Движение и маршруты · `movement` · волна 2

**Цель.** Граф маршрутов в своём модуле; проверка всего пути, а не только отмеченных точек; разлом +1 за каждый; дом вне карты (Creuss); гиперпуть не система; подсветка возврата в активную систему.

**Опирается на:** `replay-steps`

**Файлы потока:** `src/domain/movement.ts (new, from project.ts)`, `src/domain/route.ts (graph part)`

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-007 | bug | 41.3, 41-note-6 | [src/domain/replay/movement.ts:100](../../src/domain/replay/movement.ts#L100) | Разлом даёт +1 один раз на корабль; по примечанию 6 к 41 — +1 за каждый разлом и каждое прохождение. Ключ seen в routeReach тоже булев | #gravity-rift | s |  |
| P2-008 | bug | 58.3.2 | [src/domain/replay/movement.ts:84](../../src/domain/replay/movement.ts#L84) | Шаги между отмеченными точками считаются поиском, который не видит аномалий и чужих кораблей: системы между точками не проверяются. Восстанавливать весь путь или требовать соседние точки (tapStep) | #route #skipped-stop | m |  |
| P2-009 | bug | 58.3.5 | [src/domain/replay/movement.ts:128](../../src/domain/replay/movement.ts#L128) | Удаляет из подсветки и активную систему, если путь начался в ней: 58.3.5 разрешает вылететь и вернуться | #route-highlight | s |  |
| P2-010 | bug | 6-note-2 | [src/domain/strategy.ts:167](../../src/domain/strategy.ts#L167) | Дом вне карты (Creuss) получает ключ тайла 51, а не слот: граф маршрутов его не знает, gridDistance даёт 1 до любой системы, подсветка пуста. Нужен слот дома вне карты, смежный только через червоточину | #Creuss #off-map-home | m |  |
| P2-011 | bug | 6-note-2 | [src/domain/route.ts:42](../../src/domain/route.ts#L42) | Ключ не вида q,r считается в одном шаге от всего: после P2-010 бросать ошибку или возвращать Infinity | #Creuss | s | P2-010 |
| P2-012 | check | 44.2 | [src/domain/replay/movement.ts:58](../../src/domain/replay/movement.ts#L58) | Гиперпуть не система: его нельзя выбрать активной системой и в нём нельзя закончить ход — нет нарушения | #hyperlane | s |  |
| P2-006 | arch |  | [src/domain/replay/movement.ts:10](../../src/domain/replay/movement.ts#L10) | Граф маршрутов и аномалии (180 строк) живут в модуле расчёта состояния: вынести в src/domain/movement.ts | #srp #route-graph | m |  |

<a id="ws-transport"></a>
### Перевозка и подбор · `transport` · волна 2

**Цель.** Подбор только из старта, пути и активной системы, не из системы со своим жетоном (95.1, 95.3); брошенные без мест на борту юниты в системах, откуда улетели (16.3, 43.1, 95 примечание 4).

**Опирается на:** `replay-steps`

**Файлы потока:** `src/domain/transport.ts (new)`, `src/ui/plan/UnitPicker.tsx (offer)`

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-013 | check | 95.1, 95.3 | [src/domain/replay/transport.ts:8](../../src/domain/replay/transport.ts#L8) | Подборы пропускаются целиком: нет проверки, что подбор из старта, пути или активной системы (95.1), и что в системе подбора нет моего жетона (95.3). Тот баг, что нашёл пользователь | #pickup #token | m |  |
| P2-014 | check | 16.3, 16-note-4, 43.1, 55-note-1, 95-note-4 | [src/domain/replay/transport.ts:48](../../src/domain/replay/transport.ts#L48) | Места на борту проверяются только в активной системе: истребители и наземные войска, брошенные без мест на борту в системе, откуда улетели корабли, не дают нарушения | #capacity #left-behind | m |  |
| P2-322 | check | 95.3 | [src/ui/plan/UnitPicker.tsx:77](../../src/ui/plan/UnitPicker.tsx#L77) | подбор предлагается в любой системе пути, и со своим жетоном (кроме активной); предлагать по доменной проверке подбора. Местное имя placesOf затеняет доменное | #pickup #token | s |  |

<a id="ws-combat-order"></a>
### Порядок проверок вокруг боя · `combat-order` · волна 2

**Цель.** Флот проверяется при прилёте, до боя (37.3); высадка не больше мест на борту после боя (16.3.3); возврат ошибочной потери возвращает высадку.

**Опирается на:** `replay-steps`

**Файлы потока:** `src/domain/project.ts (landAndBuild order)`, `src/ui/plan/tactical.ts (withLoss)`

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-019 | bug | 76.2, 89.3 | [src/domain/replay/tactical.ts:26](../../src/domain/replay/tactical.ts#L26) | Потери снимаются до проверки флота и до высадки: флот надо проверять при прилёте (37.3), а высадку ограничивать местами на борту после боя (16.3.3). Порядок: прилёт → флот → бой → места на борту → высадка → производство | #fleet-pool #capacity #battle | m |  |
| P2-206 | bug | 78.6.2 | [src/ui/map/HexStage.tsx:271](../../src/ui/map/HexStage.tsx#L271) | Возврат ошибочной потери десантника идёт через withLoss(+1) и только уменьшает losses: юнит остаётся в космосе, а не в landings; чинить в withLoss | #losses | s |  |
| P2-300 | bug | 78.6.2 | [src/ui/plan/tactical.ts:49](../../src/ui/plan/tactical.ts#L49) | возврат (amount > 0) только уменьшает losses, а высадка, из которой десантник ушёл при потере, не восстанавливается: он остаётся в космосе. Возврат должен вернуть его в landings той планеты | #losses | s |  |

<a id="ws-invasion"></a>
### Вторжение и контроль · `invasion` · волна 2

**Цель.** Контроль только при выживших войсках (49.5), у меня и у соперника; высадка только наземных войск и только в активной системе; планета, взятая у соперника, уходит из его счёта.

**Опирается на:** `replay-steps`

**Файлы потока:** `src/domain/project.ts (landUnits, rival landings)`

**Нужно ваше решение или прототип:** P2-023 (decision)

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-020 | bug | 49.5, 42.4.4 | [src/domain/replay/invasion.ts:32](../../src/domain/replay/invasion.ts#L32) | Контроль ставится до снятия groundLosses: если все высадившиеся погибли, контроль всё равно мой. Устанавливать контроль после потерь на планете | #control | s |  |
| P2-021 | bug | 76.1, 49.2, 89.4 | [src/domain/replay/invasion.ts:20](../../src/domain/replay/invasion.ts#L20) | Высаживает любой тип юнита, в том числе корабли, и на любую планету: только наземные войска и только планеты активной системы | #landing | s |  |
| P2-022 | bug | 49.5, 25.5 | [src/domain/replay/invasion.ts:39](../../src/domain/replay/invasion.ts#L39) | Высадка соперника переворачивает контроль по одному списку landings: без проверки, что кто-то высадился и выжил; планета, взятая мной у соперника, остаётся его в state.rivals | #rivals #control | m |  |
| P2-023 | model | 27.2, 27.3, 49-note-4, 54.1 | [src/domain/replay/tactical.ts:22](../../src/domain/replay/tactical.ts#L22) | Нет жетона custodians: высадка на Mecatol Rex без 6 влияния и без очка. Решить, моделировать ли | #custodians | m |  |

<a id="ws-structures"></a>
### Строения и их владельцы · `structures` · волна 2

**Цель.** У базы и PDS есть владелец; они уничтожаются при захвате планеты (49.5.1, 63.4, 79.4); лимиты на планете (85.4-85.6).

**Опирается на:** `replay-steps`, `data`

**Файлы потока:** `src/domain/types.ts (docks, pds)`, `src/storage/schema.ts (migration)`

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-218 | bug | 49.5.1 | [src/ui/map/HexStage.tsx:311](../../src/ui/map/HexStage.tsx#L311) | Строение красится цветом держателя планеты: чужая база после захвата выглядит моей; брать владельца строения | #player-colour | s | P2-222 |
| P2-222 | bug | 49.5.1, 63.4, 79.4 | [src/ui/map/TileView.tsx:223](../../src/ui/map/TileView.tsx#L223) | PDS и база рисуются за держателем планеты: после захвата чужие строения переходят к захватчику; рисовать по владельцу строения |  | s |  |
| P2-026 | check | 24.2, 24.3, 24-note-1, 24-note-2, 63.3, 79.3, 85.4, 85.5, 85.6 | [src/domain/replay/cards.ts:60](../../src/domain/replay/cards.ts#L60) | Строения ставятся без проверок: 1 база и 2 PDS на планету, не больше двух на основное и одно на второстепенное Construction, только своя планета и планета системы второстепенного; второй док молча теряется | #construction #limits | m |  |
| P2-024 | model | 49.5.1, 63.4, 79.4 | [src/domain/types.ts:288](../../src/domain/types.ts#L288) | У баз и PDS нет владельца: при захвате планеты чужие строения переходят к захватчику вместо уничтожения. Хранить владельца, уничтожать при смене контроля, миграция схемы | #structure-owner #schema | l |  |
| P2-025 | model |  | [src/storage/schema.ts:191](../../src/storage/schema.ts#L191) | Миграция: владелец строений (P2-024) — существующие базы и PDS отдать тому, кто контролирует планету | #schema #migration | s | P2-024 |

<a id="ws-production"></a>
### Производство · `production` · волна 2

**Цель.** Место производства (68.3, 67.4.1); блокада и чужие корабли (14.1, 67.6); нет базы как нарушение домена; лимит Production (68.1); запас отрядов (67.5).

**Опирается на:** `replay-steps`, `data`

**Файлы потока:** `src/domain/production.ts (new, from project.ts)`

**Нужно ваше решение или прототип:** P2-029 (decision)

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-027 | bug | 68.3, 67.4.1 | [src/domain/replay/production.ts:12](../../src/domain/replay/production.ts#L12) | Пехота идёт на первую свою планету системы (в том числе только что захваченную), а не на планету с базой; productionGround принимается и на чужую планету (placesOf) | #placement | m |  |
| P2-028 | check | 14.1, 67.6, 67-/-79 | [src/domain/replay/production.ts:39](../../src/domain/replay/production.ts#L39) | Производство не проверяет базу (сейчас «нет дока» считается в UI), блокаду и чужие корабли в системе: нарушения noProduction и productionBlockaded в домене | #blockade #no-dock | m |  |
| P2-030 | check | 99.3 | [src/domain/replay/cards.ts:65](../../src/domain/replay/cards.ts#L65) | Производство карты (второстепенное Warfare) не проверяет домашнюю систему, базу и её Production | #warfare #card-production | s |  |
| P2-309 | check | 67-/-79, 79.4 | [src/ui/plan/TacticalEditor.tsx:47](../../src/ui/plan/TacticalEditor.tsx#L47) | «нет базы» считает UI по before.docks (чужая база тоже засчитывается); нужен код noProduction в домене, hasDock убрать | #duplicate-of-domain #warning-channel | m |  |
| P2-029 | model | 68.1, 79.1, 67.5, 72.1, 96.3 | [src/domain/replay/production.ts:49](../../src/domain/replay/production.ts#L49) | Нет лимита Production и запаса отрядов: нужны данные (P2-050, P2-051), затем нарушения productionOver и reinforcementsOut. Решить, нужно ли | #production-limit #reinforcements | m | P2-050, P2-051 |

<a id="ws-payment"></a>
### Оплата · `payment` · волна 2

**Цель.** Оплата и подготовка только своими планетами (34 примечание 2, 64 примечание 5, 71 примечание 3).

**Опирается на:** `replay-steps`

**Файлы потока:** `src/domain/payment.ts`, `src/domain/project.ts (pay)`

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-031 | check | 34-note-2, 64-note-5 | [src/domain/replay/payment.ts:40](../../src/domain/replay/payment.ts#L40) | Чужая планета в оплате молча истощается и стоит 0: нарушение planetNotControlled | #payment | s |  |
| P2-032 | check | 71-note-3 | [src/domain/replay/cards.ts:41](../../src/domain/replay/cards.ts#L41) | Готовит любые перечисленные планеты, в том числе чужие | #ready | s |  |
| P2-366 | dup |  | [src/ui/plan/ExpeditionEditor.tsx:30](../../src/ui/plan/ExpeditionEditor.tsx#L30) | «платится ресурсами или влиянием» проверяется дважды и трижды приводится as 'resources' \| 'influence'; доменный помощник оплаты части |  | s |  |

<a id="ws-strategy-cards"></a>
### Карты стратегии · `strategy-cards` · волна 2

**Цель.** Обработчик на каждую карту вместо цепочки if; кто какое свойство какой карты может применить (83.3, 83.4, 82); forToken выводится из карт раунда; Imperial, Warfare, Trade, Diplomacy, Construction, Technology по правилам.

**Опирается на:** `replay-steps`

**Файлы потока:** `src/domain/strategy.ts`, `src/domain/cards/*.ts (new)`, `src/ui/plan/StrategyEditor.tsx (logic only)`

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-034 | bug | 83.3 | [src/domain/strategy.ts:49](../../src/domain/strategy.ts#L49) | Стоимость основного берётся из сохранённого forToken, который ставит редактор при выборе карты; после смены карт раунда он устаревает. Выводить из round.strategyCard/backupCard при повторе; основное чужой карты — нарушение | #for-token | m |  |
| P2-035 | bug | 83.3 | [src/state/gameStore.ts:75](../../src/state/gameStore.ts#L75) | Меняет карты раунда, не трогая forToken записей; после P2-034 флаг не нужен | #for-token | s | P2-034 |
| P2-037 | bug | 45.2, 45-note-3 | [src/domain/replay/cards.ts:46](../../src/domain/replay/cards.ts#L46) | Очко по флажку effects.mecatol, а не по контролю Mecatol Rex (mr/mrte) в состоянии | #imperial #mecatol | s |  |
| P2-038 | bug | 99.1, 99-note-1 | [src/domain/strategy.ts:57](../../src/domain/strategy.ts#L57) | Warfare до Thunder's Edge всегда даёт жетон, даже если снять с карты нечего: давать только при снятом жетоне | #warfare | s |  |
| P2-039 | bug | 92.4 | [src/domain/replay/cards.ts:44](../../src/domain/replay/cards.ts#L44) | effects.freeSecondary хранится, но расчёт его не читает: выбранные соперники платят жетон за второстепенное | #trade #rivals | s |  |
| P2-040 | bug | 32.2, 32.3, 32-note-3 | [src/domain/replay/cards.ts:33](../../src/domain/replay/cards.ts#L33) | Diplomacy: соперники не получают жетон в выбранной системе; нет нарушений «больше двух планет», «Mecatol Rex», «система без моей планеты» (лимит 2 сейчас только в UI) | #diplomacy #rivals | m |  |
| P2-331 | bug | 45.2, 45-note-3 | [src/ui/plan/StrategyEditor.tsx:305](../../src/ui/plan/StrategyEditor.tsx#L305) | очко Imperial по флажку, доступному и без контроля Mecatol Rex; убрать переключатель, очко считает домен по контролю |  | m |  |
| P2-036 | check | 20.5, 82.1, 83.4, 83.7, 92.4.2 | [src/domain/replay/cards.ts:15](../../src/domain/replay/cards.ts#L15) | Нет понятия «чья карта»: второстепенное своей карты и повтор второстепенного одной карты за раунд проходят молча | #secondary | m |  |
| P2-041 | check | 91.2, 91.3, 90.10 | [src/domain/strategy.ts:76](../../src/domain/strategy.ts#L76) | Число исследований не ограничено (2 на основном, 1 на второстепенном) и уже известная технология оплачивается повторно | #technology | s |  |
| P2-326 | check | 32.2, 32.3, 71-note-3 | [src/ui/plan/StrategyEditor.tsx:140](../../src/ui/plan/StrategyEditor.tsx#L140) | какие планеты готовить и лимит READY_LIMIT решает UI (disabled), домен не предупреждает; правило и список планет в domain/strategy.ts, здесь только показ | #duplicate-of-domain | m |  |
| P2-033 | arch |  | [src/domain/replay/cards.ts:12](../../src/domain/replay/cards.ts#L12) | Цепочка if (entry.card === CARD.x) по всей функции: обработчик на каждую карту (основное, второстепенное, стоимость, свободные жетоны, нарушения) в src/domain/cards/ | #ocp #card-handlers | l |  |
| P2-336 | arch |  | [src/ui/plan/StrategyEditor.tsx:127](../../src/ui/plan/StrategyEditor.tsx#L127) | один switch на все карты в редакторе; по компоненту на карту (plan/editors/cards/*) вслед за обработчиками карт в домене |  | m |  |
| P2-339 | arch |  | [src/ui/plan/TokenTiles.tsx:23](../../src/ui/plan/TokenTiles.tsx#L23) | перераспределение Warfare (жетон из самого полного пула) — правило, не UI; в domain/strategy.ts | #duplicate-of-domain | m |  |
| P2-333 | dup |  | [src/ui/plan/StrategyEditor.tsx:338](../../src/ui/plan/StrategyEditor.tsx#L338) | цена жетоном повторяет playOf и costsStrategyToken (и CARD.leadership ниже); звать costsStrategyToken({ ...entry, ...playOf(...) }) | #duplicate-of-domain | s |  |

<a id="ws-round-flow"></a>
### Ход раунда · `round-flow` · волна 2

**Цель.** Пас и действия после паса (3.3, 3.4, 82.2); действие не в своей фазе (40.2).

**Опирается на:** `replay-steps`

**Файлы потока:** `src/domain/round.ts (new)`

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-042 | check | 3.3, 3.4, 82.2, 40.2 | [src/domain/replay/round.ts:8](../../src/domain/replay/round.ts#L8) | Пас ничего не проверяет: пас до своих стратегических действий, действия после паса, действие не в своей фазе | #pass | m |  |

<a id="ws-thunders-edge"></a>
### Thunder's Edge · `thunders-edge` · волна 2

**Цель.** Экспедиция (часть технологий, повтор, одна за ход), энтропийный шрам, станции, входы и выходы Излома.

**Опирается на:** `replay-steps`, `data`

**Файлы потока:** `src/domain/thundersEdge.ts`, `src/domain/payment.ts (EXPEDITION_SLICES)`

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-045 | bug | expedition-4.5 | [src/domain/replay/expedition.ts:28](../../src/domain/replay/expedition.ts#L28) | Часть «технология» без cost: оплата без планеты считается оплаченной, нет проверки специализации и контроля планеты | #expedition | s |  |
| P2-365 | bug | expedition-4.5 | [src/ui/plan/ExpeditionEditor.tsx:34](../../src/ui/plan/ExpeditionEditor.tsx#L34) | часть технологий без cost получает пустую оплату и считается оплаченной; нужна оплата истощением своей планеты с технологической специализацией |  | m |  |
| P2-046 | check | expedition-5 | [src/domain/replay/expedition.ts:13](../../src/domain/replay/expedition.ts#L13) | Часть, отмеченная в партии как моя, берётся снова; две части за один ход не дают нарушения | #expedition | s |  |
| P2-047 | check | entropic-scars-2 | [src/domain/replay/production.ts:16](../../src/domain/replay/production.ts#L16) | Производство в энтропийном шраме (тактика и карты) без нарушения | #entropic-scar | s |  |
| P2-048 | model | space-stations-2, space-stations-4 | [src/domain/replay/board.ts:29](../../src/domain/replay/board.ts#L29) | Станция — обычная планета: контроль берётся высадкой, пехота и строения ставятся на неё. Нужен признак станции и контроль присутствием кораблей | #space-station | m |  |
| P2-049 | model | fracture-5 | [src/domain/replay/board.ts:13](../../src/domain/replay/board.ts#L13) | Входы Излома (game.fracture.ingress) не смежны с его выходами: в Излом нельзя проложить маршрут | #fracture | m | P2-054 |

<a id="ws-ui-nesting"></a>
### Вложенность экранов (нужен прототип) · `ui-nesting` · волна 2

**Цель.** Не больше трёх уровней: шаги, отдельное меню, модал или шторка там, где глубже. Каждое изменение раскладки сначала прототипом на утверждение.

**Опирается на:** `ui-containers`

**Файлы потока:** `src/ui/plan/*Editor.tsx`, `src/ui/map/HexStage.tsx`, `src/ui/plan/EntryList.tsx`

**Нужно ваше решение или прототип:** P2-200 (prototype), P2-428 (prototype), P2-217 (prototype), P2-317 (prototype), P2-318 (prototype), P2-337 (prototype), P2-346 (prototype), P2-349 (prototype), P2-355 (prototype), P2-357 (prototype)

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-200 | arch |  | [src/ui/map/HexStage.tsx:85](../../src/ui/map/HexStage.tsx#L85) | 440 строк: модал, три режима, правка чужих юнитов, оплата производства и счётчики в одном компоненте; разделить на оболочку и панели setup/battle/build, покупки вынести в хук | #hex-stage #srp | l |  |
| P2-207 | arch |  | [src/ui/map/HexStage.tsx:228](../../src/ui/map/HexStage.tsx#L228) | Один обработчик нажатия на жетон ветвится по режиму, владельцу, виду и базовому составу: разбить на обработчики режимов | #hex-stage | m | P2-200 |
| P2-428 | arch |  | [src/ui/screens/PlanScreen.tsx:698](../../src/ui/screens/PlanScreen.tsx#L698) | редакторы и список взаимоисключаются цепочкой !session && !cardEntry && ..., редактор вложен в панель, UnitPicker и HexStage ещё глубже: один слот панели по состоянию автомата, шаги или отдельное меню по прототипу | #nesting | l | P2-400 |
| P2-219 | dup |  | [src/ui/map/HexStage.tsx:150](../../src/ui/map/HexStage.tsx#L150) | Тактическая запись ищется дважды (fightingFor и tactical ниже) по разным правилам: одна запись, которой принадлежат бой и покупки | #hex-stage | s | P2-200 |
| P2-217 | ui |  | [src/ui/map/HexStage.tsx:436](../../src/ui/map/HexStage.tsx#L436) | Свойства тайла и контроль планеты лежат пятым-шестым уровнем под режимом: отдельный режим сегмента или поповер | #nesting #hex-stage | m |  |
| P2-317 | ui |  | [src/ui/plan/TacticalEditor.tsx:152](../../src/ui/plan/TacticalEditor.tsx#L152) | «Бой» и «Производство» — блоки из одной кнопки; сделать строками .in-card |  | m | P2-316 |
| P2-318 | ui |  | [src/ui/plan/TacticalEditor.tsx:144](../../src/ui/plan/TacticalEditor.tsx#L144) | UnitPicker раскрывается внутри редактора (6 уровней); шаги: пока открыт перелёт, показывать только его с «Назад» |  | m |  |
| P2-337 | ui |  | [src/ui/plan/StrategyEditor.tsx:355](../../src/ui/plan/StrategyEditor.tsx#L355) | редактор длинный, 4 уровня; шаги: (1) карта и свойство, (2) параметры |  | m |  |
| P2-346 | ui |  | [src/ui/plan/EntrySteps.tsx:64](../../src/ui/plan/EntrySteps.tsx#L64) | подробности тактики 7 уровней; строки «откуда → куда» с UnitTile, полная схема в поповере |  | m |  |
| P2-349 | ui |  | [src/ui/plan/EntryList.tsx:66](../../src/ui/plan/EntryList.tsx#L66) | жетоны статуса раскрываются внутри строки записи (5 уровней); отдельное меню на месте списка, как Strategy и Adjustment |  | m |  |
| P2-355 | ui |  | [src/ui/plan/EntryList.tsx:231](../../src/ui/plan/EntryList.tsx#L231) | экспедиция раскрывается внутри строки (5 уровней); отдельное меню, как жетоны статуса |  | m | P2-349 |
| P2-357 | ui |  | [src/ui/plan/ActionMenu.tsx:17](../../src/ui/plan/ActionMenu.tsx#L17) | список действий раскрывается в подвале списка записей (4 уровня); поповер над кнопкой |  | m |  |

<a id="ws-ui-plan-screen"></a>
### Экран плана · `ui-plan-screen` · волна 2

**Цель.** Один автомат выбора на карте вместо 13 состояний; подсветка и перелёт в отдельных хуках.

**Опирается на:** `ui-logic-to-domain`

**Файлы потока:** `src/ui/screens/PlanScreen.tsx`

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-401 | model |  | [src/ui/screens/PlanScreen.tsx:129](../../src/ui/screens/PlanScreen.tsx#L129) | stage с флагами forCard/tacticalId/adjustmentId: размеченное объединение по тому, для кого открыт большой гекс, как часть автомата | #map-pick | s | P2-400 |
| P2-400 | arch |  | [src/ui/screens/PlanScreen.tsx:127](../../src/ui/screens/PlanScreen.tsx#L127) | 13 состояний режима (editing, choosing, tapPath, mapPick, systemPickFor, placing, marking, sheet, stage, adjustmentId, cardId, openId, shown) допускают невозможные сочетания и сбрасываются вручную: один автомат mapPick, размеченное объединение «что выбирает следующее нажатие» + «что открыто на панели» | #map-pick #state-machine | l |  |
| P2-403 | arch |  | [src/ui/screens/PlanScreen.tsx:196](../../src/ui/screens/PlanScreen.tsx#L196) | сброс состояний через setState во время рендера (и ниже rightDrawer/leftDrawer): выводить из game в автомате, а не догонять |  | s | P2-400 |
| P2-404 | arch |  | [src/ui/screens/PlanScreen.tsx:206](../../src/ui/screens/PlanScreen.tsx#L206) | перелёт и его повтор (startFlight, таймер повтора, loops, resting, inFlight, mapState) разбросаны по экрану: хук useFlightLoop, который отдаёт состояние карты и слой перелёта | #flight | m |  |
| P2-405 | arch |  | [src/ui/screens/PlanScreen.tsx:459](../../src/ui/screens/PlanScreen.tsx#L459) | состояние карты во время перелёта и между повторами считается посреди рендера: часть useFlightLoop | #flight | s | P2-404 |
| P2-408 | arch |  | [src/ui/screens/PlanScreen.tsx:256](../../src/ui/screens/PlanScreen.tsx#L256) | closePanels, onPick, onOpenEntry, toggleUpgrades сбрасывают по 3-11 флагов вручную, и наборы расходятся: один переход автомата «закрыть всё» |  | s | P2-400 |
| P2-411 | arch |  | [src/ui/screens/PlanScreen.tsx:311](../../src/ui/screens/PlanScreen.tsx#L311) | onTileTap из 8 веток с ранним return, их порядок и есть приоритет режимов: по обработчику на состояние автомата | #map-pick | m | P2-400 |
| P2-414 | arch |  | [src/ui/screens/PlanScreen.tsx:431](../../src/ui/screens/PlanScreen.tsx#L431) | отбор и тон стрелок плана (фокус, выполнено, режим «сейчас») перемешаны с рендером: в хук карты вместе с подсветкой |  | s | P2-415 |
| P2-415 | arch |  | [src/ui/screens/PlanScreen.tsx:442](../../src/ui/screens/PlanScreen.tsx#L442) | подсветку пишут в один объект 8 мест экрана, приоритет задаёт порядок записи и проверки !highlights[slot]: хук useMapHighlights(режим) с явным приоритетом, правила из домена | #highlight | m |  |
| P2-421 | arch |  | [src/ui/screens/PlanScreen.tsx:240](../../src/ui/screens/PlanScreen.tsx#L240) | stateBeforeEntry повторяет replay около 10 раз за рендер для одной записи (loops, routeSpeed, choosing, карты, startsArrow, редакторы, HexStage): считать один раз на запись в фокусе | #perf | s |  |
| P2-422 | arch |  | [src/ui/screens/PlanScreen.tsx:538](../../src/ui/screens/PlanScreen.tsx#L538) | цепочка тернарников подсказки повторяет приоритет режимов из onTileTap: подсказка как свойство состояния автомата | #map-pick | s | P2-400 |
| P2-423 | arch |  | [src/ui/screens/PlanScreen.tsx:157](../../src/ui/screens/PlanScreen.tsx#L157) | drawer, rightDrawer, leftDrawer, teOpen и их догон в рендере: хук useDrawers; «шторка уступает карте» при placing/marking — состояние автомата | #drawer | s |  |
| P2-424 | dup |  | [src/ui/screens/PlanScreen.tsx:572](../../src/ui/screens/PlanScreen.tsx#L572) | владелец записи в руках ищется заново тем же поиском по fromCard, что в onTileTap: брать из состояния автомата | #rivals | s | P2-400 |
| P2-429 | dup |  | [src/ui/screens/PlanScreen.tsx:718](../../src/ui/screens/PlanScreen.tsx#L718) | переключатель ручной оплаты по id записи написан дважды (тактика и карта): одна функция toggleManualPayment(id) |  | s |  |
| P2-402 | doc |  | [src/ui/screens/PlanScreen.tsx:52](../../src/ui/screens/PlanScreen.tsx#L52) | комментарий про Editing стоит над DrawerName: перенести к интерфейсу Editing |  | s |  |

<a id="ws-rivals"></a>
### Соперники в общей картине · `rivals` · волна 3

**Цель.** Маршруты и блокировки видят действия соперников по плану; взгляд соперника видит мои корабли; списки выбора на картах соперника верны.

**Опирается на:** `replay-steps`, `movement`

**Файлы потока:** `src/domain/players.ts (gameAs)`, `src/domain/project.ts (rival replay)`

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-043 | bug | 58.3.2 | [src/domain/replay/movement.ts:63](../../src/domain/replay/movement.ts#L63) | Блокировка берётся из game.enemyUnits (расставлено вручную), а не из состояния соперников при повторе: приведённые соперником корабли не мешают, уведённые мешают; маршруты соперника не видят моих кораблей | #rivals #route | l |  |
| P2-044 | bug | 92.4 | [src/domain/players.ts:52](../../src/domain/players.ts#L52) | Взгляд соперника оставляет opponents как есть (в списках выбора есть он сам и нет меня) и не добавляет мои юниты в enemyUnits | #rivals #game-as | m | P2-043 |
| P2-328 | bug | 92.4 | [src/ui/plan/StrategyEditor.tsx:85](../../src/ui/plan/StrategyEditor.tsx#L85) | на карте соперника game = gameAs: списки Trade и Politics предлагают самого соперника и не предлагают меня; нужен доменный список «другие игроки владельца записи» | #player-choice | m |  |
| P2-420 | bug | 58.3.2 | [src/ui/screens/PlanScreen.tsx:490](../../src/ui/screens/PlanScreen.tsx#L490) | досягаемость считается по gameAs и вручную расставленным game.enemyUnits: корабли, приведённые или уведённые соперниками по плану, не учтены, соперник не видит моих (B2); блокировки брать из состояния перед записью | #rivals | m |  |
| P2-360 | check |  | [src/ui/plan/LandingBlock.tsx:59](../../src/ui/plan/LandingBlock.tsx#L59) | чужие войска берутся из game.enemyGround (расстановка), а не из состояния соперников по плану (state.rivals): их высадки раньше в плане не видны | #rivals | m |  |

## По правилам

| Правило | TODO |
|---|---|
| entropic-scars-2 | P2-047 |
| space-stations-2 | P2-048 |
| 3.3 | P2-042 |
| 3.4 | P2-042 |
| space-stations-4 | P2-048 |
| expedition-4.5 | P2-045, P2-365 |
| expedition-5 | P2-046 |
| fracture-5 | P2-049, P2-054 |
| 5.2 | P2-015 |
| 6-note-2 | P2-010, P2-011 |
| 14.1 | P2-028 |
| 16.3 | P2-014 |
| 16-note-4 | P2-014 |
| 20.3 | P2-016 |
| 20.4 | P2-015 |
| 20.5 | P2-036 |
| 20.6 | P2-018 |
| 23.2 | P2-016 |
| 24 | P2-416 |
| 24-note-1 | P2-026 |
| 24.2 | P2-026 |
| 24-note-2 | P2-026 |
| 24.3 | P2-026 |
| 24.4 | P2-050 |
| 25.5 | P2-022 |
| 27.2 | P2-023 |
| 27.3 | P2-023 |
| 32 | P2-416 |
| 32.2 | P2-040, P2-326 |
| 32.3 | P2-040, P2-326 |
| 32-note-3 | P2-040 |
| 34-note-2 | P2-031 |
| 37.3 | P2-017 |
| 40.2 | P2-042 |
| 41.3 | P2-007 |
| 41-note-6 | P2-007, P2-062 |
| 42.4.4 | P2-020 |
| 43.1 | P2-014 |
| 44.2 | P2-012 |
| 45.2 | P2-037, P2-331 |
| 45-note-3 | P2-037, P2-331 |
| 49.2 | P2-021 |
| 49-note-4 | P2-023 |
| 49.5 | P2-020, P2-022 |
| 49.5.1 | P2-024, P2-218, P2-222 |
| 54.1 | P2-023 |
| 55-note-1 | P2-014 |
| 58.3.2 | P2-008, P2-043, P2-420 |
| 58.3.5 | P2-009 |
| 63.3 | P2-026 |
| 63.4 | P2-024, P2-222 |
| 64-note-5 | P2-031 |
| 67.4.1 | P2-027 |
| 67.5 | P2-029 |
| 67.6 | P2-028 |
| 67-/-79 | P2-028, P2-309 |
| 68.1 | P2-029, P2-051 |
| 68.3 | P2-027 |
| 71-note-3 | P2-032, P2-326 |
| 72.1 | P2-029, P2-050 |
| 76.1 | P2-021 |
| 76.2 | P2-019 |
| 78.6.2 | P2-206, P2-300 |
| 79.1 | P2-029, P2-051 |
| 79.3 | P2-026 |
| 79.4 | P2-024, P2-222, P2-309 |
| 81.5 | P2-017 |
| 82.1 | P2-036 |
| 82.2 | P2-042 |
| 83.3 | P2-034, P2-035, P2-063 |
| 83.4 | P2-036 |
| 83.7 | P2-036 |
| 85.4 | P2-026 |
| 85.5 | P2-026 |
| 85.6 | P2-026 |
| 89.1 | P2-015 |
| 89.3 | P2-019 |
| 89.4 | P2-021 |
| 90.10 | P2-041 |
| 91.2 | P2-041 |
| 91.3 | P2-041 |
| 92.4 | P2-039, P2-044, P2-328 |
| 92.4.2 | P2-036 |
| 95.1 | P2-013 |
| 95.3 | P2-013, P2-322 |
| 95-note-4 | P2-014 |
| 96.2 | P2-050, P2-052 |
| 96.3 | P2-029 |
| 97.1 | P2-053 |
| 99 | P2-416 |
| 99.1 | P2-038 |
| 99-note-1 | P2-038 |
| 99.3 | P2-030 |

## По слоям и тегам

Слои: domain 51, storage 1, state 1, data 1, i18n 2, docs 3, ui 309.

Теги: #duplicate-of-domain 21, #colour-token 21, #duplicate-selector 17, #rivals 16, #player-colour 15, #inline-style 13, #section-title 12, #warning-channel 10, #unit-tile 9, #svg 7, #preferences 7, #primitives 7, #confirm-bar 6, #names 6, #dead-css 6, #modal 5, #drawer-sheet 5, #player-dot 5, #route 4, #fracture 4, #purity 4, #geometry 4, #hex-stage 4, #imports 4, #section 4, #player-choice 4, #map-pick 4, #srp 3, #reinforcements 3, #for-token 3, #i18n 3, #route-badge 3, #motion 3, #drawer 3, #legend 3, #popover 3, #upgrade-toggle 3, #thunders-edge 3, #selected-state 3, #hover 3, #warning 3, #gravity-rift 2, #Creuss 2, #pickup 2, #token 2, #capacity 2, #fleet-pool 2, #construction 2, #control 2, #schema 2, #warfare 2, #payment 2, #expedition 2, #losses 2, #nesting 2, #command-token 2, #ingress 2, #route-draft 2, #overlays 2, #layout 2, #panel 2, #banner 2, #token-picture 2, #player-name 2, #flight 2, #new-entry 2, #valid-sources 2, #expansion-names 2, #caption-small 2, #floating-card 2, #hex-button 2, #contract-test 1, #route-graph 1, #skipped-stop 1, #route-highlight 1, #off-map-home 1, #hyperlane 1, #left-behind 1, #activation 1, #token-supply 1, #redistribute 1, #battle 1, #landing 1, #custodians 1, #structure-owner 1, #migration 1, #limits 1, #placement 1, #blockade 1, #no-dock 1, #production-limit 1, #card-production 1, #ready 1, #ocp 1, #card-handlers 1, #secondary 1, #imperial 1, #mecatol 1, #trade 1, #diplomacy 1, #technology 1, #pass 1, #game-as 1, #entropic-scar 1, #space-station 1, #production-value 1, #provenance 1, #unit-upgrade 1, #data-cycle 1, #layering 1, #comments 1, #enemy-units 1, #production 1, #structures 1, #stacks 1, #energy 1, #planet 1, #close-button 1, #expansions 1, #hyperlanes 1, #chips 1, #map-builder 1, #editor-frame 1, #state-machine 1, #highlight 1, #card-targets 1, #route-hint 1, #perf 1, #editor-head 1, #card-purchases 1, #tests 1, #danger 1, #import 1, #share-link 1, #units 1, #faction-groups 1, #hex-geometry 1, #scrollbar 1, #danger-button 1, #card-surface 1, #small-button 1, #panel-reset 1, #scrim 1, #radius-token 1, #map 1, #font-stack 1, #shadow 1.
