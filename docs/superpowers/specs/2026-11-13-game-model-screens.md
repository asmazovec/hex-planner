# Перенос экранов на модель игры: опись

Рабочий документ последнего шага. Ядро (`src/game`: `Board`, события, `apply`, шаги `resolve`, `timeline`, запросы, виды, `abilities/`) считает всё; экраны и хранилище ещё живут на старой модели (`Game`, `GameState`, `Entry`, `Projection`). Опись снята по `src/ui`, `src/state`, `src/storage` без тестов (счёт по файлам и местам импорта, а не по строкам). Правило ядра теперь проверяет `src/game/contract.test.ts`: ничто в `src/game`, кроме моста (`legacyViews.ts`, `fromLegacy.ts`, `compare.ts`, стенд оракула) и тестов, не импортирует старые виды, `fromLegacy` и типы `GameState`/`Holdings`; `legacyViews` импортирует только `src/state/projection.ts` и тесты. Один мост со стороны экранов: `src/state/projection.ts`.

Объём: 142 файла (плюс 54 файла зовут `useGame`). Файлы с типами старой модели: план 28 из 45, сцена 6 из 9, карта 9 из 19, шторки 7 из 18, экран партии 6 из 43, состояние и хранилище 7 из 8.

## (a) Типы старой модели (импорты в файлах без тестов)

| Область | `Game` | `GameState` | `Holdings` | `Entry` | `EntryBody` | `Projection` |
| --- | --- | --- | --- | --- | --- | --- |
| План и редакторы (`ui/plan`, `screens/PlanScreen`, `screens/plan`) | 22 | 17 | 0 | 14 | 2 | 0 |
| Большой гекс (`ui/map/stage`) | 4 | 5 | 1 | 1 | 0 | 0 |
| Карта (`ui/map`, `builder`) | 9 | 2 | 0 | 0 | 0 | 0 |
| Шторки (`ui/drawers`, `components`, `players`) | 7 | 1 | 0 | 0 | 0 | 0 |
| Экран партии и общее (`ui/screens`, `App`, `common`) | 5 | 1 | 0 | 1 | 0 | 0 |
| Состояние и хранилище (`state`, `storage`) | 7 | 1 | 0 | 2 | 1 | 1 (объявлен в `projection.ts`) |

## (b) Прямые чтения полей старого состояния (число обращений `.поле`)

| Область | Чтения |
| --- | --- |
| План | `strategy` 67 (в большинстве это поле записи, не пул), `tradeGoods` 20, `holdings` 19, `tactic` 11, `fleet` 8, `commodities` 6, `rivals` 6, `ground` 6, `control` 5, `exhausted` 5, `tokensOnMap` 3, `laws` 2 |
| Большой гекс | `ground` 6, `holdings` 6, `rivals` 4, `systems` 4, `control` 3, `exhausted` 3, `fleet` 3, `tradeGoods` 1 |
| Карта | `control` 2, `exhausted` 2, `tokensOnMap` 2, `rivals` 1 |
| Шторки | `holdings` 8, `rivals` 2, `laws` 1, `exhausted` 1 |
| Экран партии | 0 |
| Состояние и хранилище | `planetControl` 2, `enemyUnits` 2, `rivals` 2 (настройка партии и проекция) |

Чтения идут через `Frame.before`/`after`, `state.rivals[id]` и `gameAs`; из ядра в экран ничего старого не течёт, это переходник `projection.ts`.

## (c) Вызовы функций старой модели

Счёт: число пар «файл, имя» из модулей старой модели (общие данные, карты и раскладки не считаются).

| Область | Пар | Что вызывается | Чем заменяется |
| --- | --- | --- | --- |
| План | 129 | `domain/tactical.ts` (около 45 имён: `sourcesOf`, `viaOf`, `groupOf`, `withLanding*`, `withLoss`, `flightOf`, `stateInFlight`, `entrySystems`, `arrowsOf`...), `domain/strategy.ts` (около 25: `cardCost`, `freeTokens`, `heldCards`, `strategyTokensOwed`, `cardChange`, ...), `domain/payment.ts` (`autoPay`, `planetValue`, `shownPlanetValues`, ...), `domain/holdings.ts` (`losable`, `tradable`, `notesOfFirst`, `holdingCount`...), `domain/project.ts` (`standing`, `routeSteps`, `systemsAdjacent`, `readyResources`, `productionDue`, `tacticalMeters`, `statusTokensFree`...), `players.ts` (`gameAs`, `opponentsBySeat`, `playersOf`), `stacks.ts` (`playerState`, `othersOnPlanet`), `newEntry.ts`, `effects/*` (`choicesFor`, `effectOf`, `holderOf`, `playedCost`, `landingOffers`), `replay/cards/targets`, `replay/research` | см. таблицу ниже |
| Большой гекс | 37 | `domain/project.ts` (`fleetLimit`, `productionCost`, `productionPlaces`, `systemMeters`, `placesOf`, `structureOwner`...), `stacks.ts` (`stacksOf`, `holderIn`, `enemyChange`, `structureInGame`), `tactical.ts` (`withLoss`, `withFleetRemoval`, `withAdjustedUnit`, `lossesOf`, `TacticalEntry`), `strategy.ts` (`withStructure`, `withProduction`, `startingPds`), `losses.ts`, `players.ts` (`gameAs`, `planetHolder`) | `stacksOn`, `fleetLimit`, `capacityIn`, `costOf`, `productionLimit`, `planetsIn`, `tileKindIn`, `shipsIn`, `groundOn` (есть); потери и снятия сверх резерва: см. «нет» |
| Карта | 17 | `project.ts` (`isOnMap`, `systemPlanets`, `tileIdOf`), `stacks.ts` (`stacksOf`, `holderIn`), `players.ts` (`opponentsBySeat`, `emptySeatHomes`, `playersOf`), `route.ts` (`strokeStep`, `routeFromPath`, `areAdjacent`: чистые, берут `Adjacency`) | `mapSource`, `planetsIn`, `adjacentSlots`, `areJoined`, `stacksOn`; `route.ts` остаётся (чистый) |
| Шторки | 22 | `holdings.ts` (`ownNotes`, `noteCards`, `holdingsOf`, `upgradesOf`, `staysInPlay`...), `players.ts` (`opponentHoldings`, `opponentsBySeat`, `countChangeEffect`, `addPlayer` в сборщике), `effects/breakthrough`, `componentSearch` (чистый) | `playerView`/`tableView`/`seenBy`, `cardsOf`, `upgradesOf(board)`; `ownNotes` по Table: нет |
| Экран партии | 7 | `hintsAt`, `ruleOf`, `isWaived`, `homeNotes`, `readyToPlay`, `shareLinkQuery`, `COMPONENT_GROUPS` | `hintsAt` над доской есть (`abilities/registry`), остальное чистое |
| Состояние и хранилище | 16 | `players.ts` (`addPlayer`, `removePlayer`, `swapSeats`, `setPlayerFaction`, `placeStartUnits`, `withSeatHomes`), `strategy.ts` (`startingDocks`, `startingPds`, `withForTokenOfRound`), `holdings.ts` (`setLeader`, `setStartHolding`), `losses.ts`, `mapBuilder.changeLayout`, `thundersEdge.withFractureMoved`, `mecatol.withTeMecatol`, `replay/transport.checkSystem`, `newGame.createGame` | `Table` и `setup` строят всё это событиями; запись раундов: `Turn` |

Старое, у чего в ядре уже есть замена, и то, чего нет:

| Старое | Замена в ядре | Статус |
| --- | --- | --- |
| `state.systems`, `ground`, `afloat`, `control`, `exhausted`, `tokensOnMap`, пулы, товары, очки | `shipsIn`, `groundOn`, `ownerOf`, `planetsOf`, `poolsOf`, `tokensOnMap`, `PlayerView` | есть |
| `holdings` (технологии, карты, обязательства, лидеры, реликвии) | `cardsOf`, `PlayerView.cards`, `upgradesOf` | есть |
| `Frame.before/after`, `boardBefore/After`, `seenBefore/After`, `projectionAtRound` | кадры `Timeline.frames` ядра (`before`, `after`: `Board`), `byTurn` | есть |
| `tacticalNumbers`, `turnsOf` | `turnNumbers`, `planOf` (мост) | есть |
| `fleetLimit`, `fleetExcess`, `dockFighterRoom`, `systemMeters` | `fleetLimit`, `fleetIn`, `capacityIn`, `dockFighterRoomIn` | есть |
| `productionCost`, `productionDue`, `productionPlaces` | `costOf`, `productionLimit` | `productionPlaces` → `productionSites(table, board, pack, turn)` (`src/game/flight.ts`), `productionDue` → `productionDueOnBoard` (`planQueries.ts`, та же `productionDueOn` над `Ground`): есть |
| `readyResources`, `readyInfluence`, `planetValue`, `autoPay`, `shownPlanetValues` | `planetValue`, `readyPlanets`, `payingPlanets`, `tradeGoodWorth` | `autoPay` → `autoPayOn`, `sliceAutoPayment` → `sliceAutoPaymentOn` (общее ядро `choosePayment` в `domain/payment.ts`): есть; `shownPlanetValues`: нет |
| `routeSteps`, `systemsAdjacent`, `blockersOf`, `pickupAllowed` | `stepsOf`, `pathOf`, `adjacentSlots`, `areJoined`, `blockersOf`, `reach` | есть; `pickupAllowed`: нет (запрос по `routeReadsOn`) |
| `tacticalMeters`, `stateInFlight`, `flightOf`, `flies`, `fliesNow`, `entrySystems`, `arrowsOf` (полёт и стрелки) | нет: читают состояние до и после активации | `flightOf`, `metersOf`, `inFlight`, `flies` (`src/game/flight.ts`: доска на стадиях действия через `playTactical`), `arrowsOf` над `Tactical` (`edit/tactical.ts`): есть, тесты 1 к 1; экраны ещё зовут старые, поэтому старый `onActivate` Neuroglaive и исключение в `hooks.test.ts` остаются до шага 4 |
| `withLoss`, `withLanding*`, `withFleetRemoval`, `withAdjustedUnit`, `addUnits`, `viaOf`, `sourcesOf`, `groupOf`, `emptySources`, `hasCargo`, `structuresFor`... (правка тела записи) | нет: функции над `Tactical`/`Flight`/`Landing` из `actions.ts` | `src/game/edit/tactical.ts`: те же функции `Turn → Turn`, тесты 1 к 1 через мост (старые остаются отдельной реализацией до шага 5): есть |
| `newEntryBody`, `tacticalBody`, `tacticalOwner` | нет | `newTurn`, `plannedCard`, `tacticalOwner` в `src/game/edit/new.ts`: есть |
| `cardCost`, `freeTokens`, `strategyTokensOwed`, `cardChange`, `researchLimit`, `readyLimit`, `heldCards`, `startsAsPrimary`, `withLeadershipTokens` | `holderIn`, `statusTokensFree`, `heldCards` в раунде, `resolve/cards` | частично; чистая часть остаётся в `domain/strategy.ts` над `Turn` |
| `gameAs`, `opponentsBySeat`, `playersOf`, `planetHolder`, `playerState`, `othersOnPlanet` | `Table.players`, `seenBy`, `tableView`, `ownerOf` | есть |
| `holdingsOf`, `ownNotes`, `noteCards`, `losable`, `tradable`, `notesOfFirst` | `playerView(...).cards`, `cardsOf` | `notesOf`, `losableOf`, `tradableOf`, `notesOfFirst` (`planQueries.ts`); для шторок `legacyNotes`, `shelfOf`, `shownOf` (`src/game/shelf.ts`: тот же лист владения и старые адреса обязательств): есть |
| `standing`, `isWaived`, `ruleOf`, предупреждения `WarningList` | `Warning` ядра, `standing` (чистая) | есть |
| `choicesFor`, `shownChoices`, `withChoices`, `choicesBefore`, `effectOf`, `holderOf`, `playedCost`, `landingOffers`, `cardTargets` | `choicesOf` (`abilities/choices`), `holderIn`, `effectOf` (`abilities/facade`) | `landingOffersOn`, `cardTargetsOn` (общее ядро `cardTargetsOver`), `playedCostOf`: есть |

## (d) Что пишет старый `Game` и что в ядре

| Писатель | Что пишет | Ядро |
| --- | --- | --- |
| Хранилище `src/state/gameStore.ts` (около 45 действий, `useGame`) | черновик `draft: Game`, `plans[].rounds[].entries`, `activePlanId`, `undo` (история) | `Table` (игроки, карта, раскладка, дополнения) и `Round[]` из `Turn`; план: список раундов с ходами; история через неизменяемые копии |
| Редакторы записей (`TurnEditor`, `TacticalEditor`, `StrategyEditor`, `AdjustmentEditor`, `ExpeditionEditor`, блоки) | тела `Entry` через `updateEntry(id, patch)` и функции `with*` из `tactical.ts`/`strategy.ts` | `Turn.action` (`Tactical`, `Strategic`, ...), правка над ним (см. «нет» выше) |
| Большой гекс, режим «Расстановка» и «Контроль» (`SetupPanel`, `ControlPanel`, `HexStage` через `useStage`) | `setEnemyUnits`, `setEnemyGround`, `setPlanetControl`, `setDock`, `setPds`, `setLeader`, `setStartHolding`: поля `Game` (`enemyUnits`, `enemyGround`, `planetControl`, `docks`, `pds`, `start`) | события начального расположения: `UnitsPlaced`, `PlanetGained`, `StructurePlaced`, `CardGained` в `Table.setup` (сейчас `setup.ts` строит старт из фракций; ручное расположение нужно записывать в `Table`) |
| `src/storage/schema.ts` (zod, `SAVE_FORMAT = 'ti4-planner/2'`), `db.ts`, `transfer.ts` | сохранение целой `Game` | `ti4-planner/3` |
| Ссылка на партию (`domain/shareLink.ts`, `draftFromShare`, `shareDifferences`) | черновик `Game` и сравнение с сохранением | параметры те же, черновик собирает `Table` |
| `projection.ts` (адаптер) | читает `Game`, строит `Table` (`tableOf`), доску (`boardOf`), раунды (`planOf`), отдаёт старые `GameState` через `legacyViews` | исчезает |

## Порядок шагов (каждый выпускается: приложение работает после него)

1. (сделано, кроме перевода старых функций в оболочки: они берут `GameState`, их зовут экраны, перевод на шагах 4-5) Запросы, которых нет (см. «нет»): `flightOf`, `productionSites`/`productionDueOn`, `autoPayOn`, `notesOfFirst`/`losableOf`, `landingOffers`/`cardTargets`/`playedCost` над доской, правка тела `Tactical` в `src/game/edit/`, `newTurn`. Тесты 1 к 1 со старыми функциями, старые функции становятся оболочками. Экраны не трогаются.
2. (сделано: `ComponentsPanel` и счёт игроков плана читают доску кадра, `src/ui/contract.test.ts` со списком `KERNEL_ONLY`; ошибка описи: `PlayerList` и остальные файлы шторок состояния не читали, `live` собирает `PlanScreen`, теперь через `shownOf`; адреса обязательств на доске старые (`@me`) для партии из `Game` и `@p1` для доски `setup`, `legacyNote` сводит их) Шторки и экран партии: читают `seenBy`/`PlayerView` вместо `state.holdings`/`rivals` (старого `Frame` берут только доску из `kernel`). Состояние `Game` не меняется.
3. Карта и большой гекс (чтение): `stacksOn`, `shipsIn`, `groundOn`, `planetsIn`, `fleetLimit` и прочее по доске кадра. Предупреждения и подсветка идут из ядра.
4. План и редакторы, чтение: итоги, предупреждения, блоки показывают доску кадра и `PlayerView`; редакторы пока пишут `Entry` (мост `turnOf` остаётся).
5. Редакторы переходят на `Turn.action` (пишут их через `src/game/edit/`), `Entry` и `EntryBody` исчезают из `ui`; мост `legacyEntry` остаётся только в ядре.
6. Хранилище: `GameStore` держит `Table` и раунды ходов; `projection.ts` становится тонкой оболочкой над `timeline`; расстановка большого гекса пишет события начала. Формат `ti4-planner/3`: `Table` и раунды ходов, старые сохранения не читаются (решено: загрузчик показывает их как непрочитанные, выгрузка и удаление остаются), экспорт и импорт, ссылка на партию.
7. Удаление: `legacyViews`, `fromLegacy`, `compare`, `domain/replay/*`, старые `GameState`, `Holdings` (как состояние), `Game`, `Entry`, оракул и его снимки.

Решение по формату сохранения: `ti4-planner/3` = `Table` (игроки, карта, раскладка, дополнения, стартовые события) плюс раунды из `Turn`, схема zod переписывается, `SAVE_FORMAT` меняется на шаге 6; сохранения `ti4-planner/2` не обновляются.

## Риски

- Ручная расстановка большого гекса (юниты соперников, контроль, доки, PDS, лидеры, стартовые карты) сейчас лежит в полях `Game`; в модели ядра ей нужно место в `Table` (стартовые события), иначе шаг 6 теряет возможности.
- Полёт (`tacticalMeters`, `stateInFlight`, повтор перелёта) читает состояние до и после активации в старой форме; без запроса `flightOf` анимация и подсказки не переносятся. Пункт Neuroglaive с `onActivate` старой формы стоит в той же очереди.
- Редакторы (около 130 пар вызовов в плане) строят тела по старым `with*`: перенос шагами 4 и 5 должен идти по редакторам, не по функциям, иначе половина экрана на одной модели, половина на другой.
- Стоимость кадров: `timelineOf` сегодня считает ядро и ещё строит старые виды для экрана; бенч `projection.bench.ts` (18,6 / 14,0 / 2,75 мс) не должен ухудшиться: прочь видов после шага 4.
- Тесты экранов (`*.test.tsx`, e2e на 69 сценариев) собирают партии из `Game` через фикстуры; на шаге 6 их фикстуры нужно собрать в `Table`.
- Оракул замороженный сравнивает ядро со старым повтором: его снимки нужно оставить, пока живёт `domain/replay/*` (удаляются вместе, шаг 7).
