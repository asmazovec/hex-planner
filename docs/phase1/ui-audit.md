# Ревизия UI (src/ui)

Пути относительно `src/ui/`; `theme.css:N` — строка `src/ui/theme.css`. Номера строк на момент ревизии (ветка `chore/github-pages` с незакоммиченными правками).

## 1. Каталоги

### 1.1 Нарушения размещения и направления зависимостей

- `plan/RowIcon.tsx:25` `HexRemove` — общий примитив в фичевой папке; его импортируют `common/ExportReminder.tsx`, `App.tsx`, `map/HexStage.tsx`, `map/TilePopover.tsx`, `map/MapLegend.tsx`, `players/PlayerList.tsx`, `players/FactionPicker.tsx`, `screens/GameScreen.tsx`. `common` зависит от `plan`.
- `map/usePanZoom.ts:22-24` `reducedMotion`/`animates` — настройка приложения, а не жест карты; импортируют `map/Drawer.tsx`, `plan/SummaryBar.tsx`, `screens/PlanScreen.tsx`.
- `plan/EntryList.tsx:52` `NoteField` — примитив поля спрятан в списке записей (импорт из `AdjustmentEditor`, `GameScreen`).
- `plan/WarningText.tsx`, `plan/warningPlaces.ts` — используются и в `map/HexStage.tsx`.
- `plan/ExpeditionWidget.tsx`, `plan/FractureControl.tsx` — только в `map/ThundersEdgePanel.tsx`.
- `plan/FactionCard.tsx`, `FactionComponents.tsx` — только в `players/PlayerList.tsx`; `plan/ShipStats.tsx` — в `FactionCard` и `map/UpgradesPanel.tsx`.
- `players/UnitIcon.tsx` — картинка юнита, используется в `plan/` и `map/`; место в `units/`.
- `map/opponentName.ts` и `players/factionName.ts` — два модуля имён игроков.
- `TokenPicture` определён дважды: `units/UnitToken.tsx:17` и `map/UnitShop.tsx:20`.
- `common/blur.ts`, `energy.ts`, `flightLoop.ts` — три почти одинаковые настройки в `localStorage`.
- `plan/PlanScreen.test.tsx` тестирует `screens/PlanScreen`, но лежит в `plan/`.

### 1.2 Предлагаемая структура

```
ui/
  primitives/   Icon.tsx (RowIcon, HexRemove), Stepper.tsx, NoteField.tsx, Section.tsx*, SectionTitle.tsx*,
                PlayerDot.tsx*, ConfirmBar.tsx*
  feedback/     Banner.tsx, WarningText.tsx, warningPlaces.ts
  overlays/     Modal.tsx*, Drawer.tsx (+DrawerTab, DrawerSheet*), Popover.tsx (из TilePopover)
  common/       download.ts, preferences.ts (blur/energy/flightLoop одной фабрикой), motion.ts,
                useReorderDrag.ts, ExportReminder.tsx, ShareConflict.tsx, ErrorBoundary.tsx
  units/        UnitToken.tsx (один TokenPicture), UnitIcon.tsx, UnitTile.tsx*, TokenLayer.tsx, sprites.ts, unitArt.ts, unitOrder.ts
  map/          HexMap.tsx, TileView.tsx, FlightLayer.tsx, flight.ts, geometry.ts, viewLimits.ts, usePanZoom.ts, useArrowDrag.ts
  map/stage/    HexStage.tsx, UnitShop.tsx, PlanetDetails.tsx
  map/builder/  MapBuilderPanel.tsx, TileNumberInput.tsx, MapStringImport.tsx, LayoutPicker.tsx
  drawers/      MapLegend.tsx, UpgradesPanel.tsx, ThundersEdgePanel.tsx, ExpeditionWidget.tsx, FractureControl.tsx
  players/      PlayerList.tsx, FactionPicker.tsx, SeatMap.tsx, useSeatDrag.ts, FactionCard.tsx, FactionComponents.tsx,
                ShipStats.tsx, names.ts
  plan/         PlanTabs.tsx, SummaryBar.tsx, EntryList.tsx, EntrySteps.tsx, ActionMenu.tsx, StrategyCards.tsx
  plan/editors/ TacticalEditor.tsx, StrategyEditor.tsx, AdjustmentEditor.tsx, ExpeditionEditor.tsx, UnitPicker.tsx
  plan/blocks/  PaymentBlock.tsx, LandingBlock.tsx, TokenTiles.tsx, EntryUpgrades.tsx
  screens/      GameScreen.tsx, PlanScreen.tsx (+ тест)
src/domain/tactical.ts  ← plan/tactical.ts, кроме systemName и flightRoutes
```

`*` — новые контейнеры из раздела 4.

## 2. Существующие контейнеры визуального языка

| Понятие | Канон | Где | Настройки |
|---|---|---|---|
| Кнопка | `button`, `.primary`, `[aria-pressed]` | theme.css:109-125, 140-143 | `primary`, `aria-pressed`, `disabled` |
| Гекс-кнопка | `.hex-button` (компонент только `HexRemove`) | theme.css:460-470, 883-885, 932 | `aria-current`, `aria-pressed`, `.nav-export-due` |
| Закрыть/удалить | `HexRemove` | `plan/RowIcon.tsx:25` | `label`, `className`, `disabled` |
| Сегмент | `.segment` (+ `.map-mode`, `.plan-rounds`) | theme.css:173-178 | `aria-pressed`/`aria-checked` |
| Чипы | `.chips`/`.chip` | theme.css:650-656 | только на «Партии» |
| Вариант | `.option` (золото) | theme.css:422-423 | только в StrategyEditor |
| Управление в карточке | `.in-card`, `.source-button` | theme.css:533-538 | — |
| Запись плана | `.entry` + модификаторы | theme.css:448-459 | `-done/-warned/-rival`, `--owner` |
| Блок редактора | `.editor-section`, `.panel-head` | theme.css:523-530 | **компонента нет**, 31 ручная сборка |
| Заголовок раздела | групповой селектор 8 классов | theme.css:888-900 | **компонента нет**, тег и класс разные |
| Предупреждение | `WarningText`, `WarningList`, `placeWarnings` | `plan/WarningText.tsx:12,39`, `plan/warningPlaces.ts:49` | нет варианта «в строке», нет произвольного текста |
| Баннер | `Banner` | `common/Banner.tsx:10` | `kind`, `message`, `action` |
| Счётчик | `Stepper` | `plan/Stepper.tsx:15` | `value`, `of`, `note`, `min` |
| Вкладки | `PlanTabs`, `DrawerTab` | `plan/PlanTabs.tsx:33`, `map/Drawer.tsx:49` | `side`, `open` |
| Шторка | `Drawer` | `map/Drawer.tsx:14` | `open`, `className`, `onDismiss` |
| Модал | **компонента нет**: `.stage` + три разные коробки | theme.css:220, 557, 935 | — |
| Поповер | `TilePopover` | `map/TilePopover.tsx:18` | привязан только к гексу |
| Плитка юнита | `UnitButton` (`.pic`) | `plan/UnitPicker.tsx:40` | `count`, `taken`, `showOne` |
| Поле | `.field` | theme.css:154-155 | — |

## 3. Отклонения

### 3.1 Предупреждения мимо `WarningList`

| Место | Сейчас | Должно быть |
|---|---|---|
| `plan/EntryList.tsx:209-211` | своя `ul.warning-list` | `WarningList variant="row"` |
| `common/ShareConflict.tsx:20` | `p.warning-text.place-warnings` | `WarningList` с текстом |
| `map/HexStage.tsx:370` | `tapNote` как `p.warning-text` | то же |
| `map/HexStage.tsx:411`, `plan/TacticalEditor.tsx:47,165` | «нет дока» считается в UI, дважды | доменный код (`noProduction`, см. rules-tests.md) через `WarningList` |
| `plan/EntrySteps.tsx:94,109` | «перегруз» пересчитан из `tacticalMeters` | коды `capacityGroup`/`unitsMissing` записи |
| `map/TileNumberInput.tsx:59` | разметка баннера руками | `Banner kind="warning"` |
| `map/HexStage.tsx:317-321, 401-408` | сам решает «перебор» флота, вместимости, ресурсов | коды `fleetPool`/`capacitySystem`/`shortResources` |
| `plan/AdjustmentEditor.tsx:69` | все предупреждения в блок «Система» | `placeWarnings` + остаток вверху |
| `plan/ExpeditionEditor.tsx:57` | остаток у выбора части | остаток вверху редактора (CLAUDE.md) |
| theme.css:242 | `var(--warning, #e8a33d)` при токене `#f0a463` | `var(--warning)` |

### 3.2 Блок редактора собран руками — 31 место

`div.editor-section` > `strong` или `div.panel-head` > содержимое > `WarningList`: AdjustmentEditor:40,45,49,55; ExpeditionWidget:38; FractureControl:21; PaymentBlock:41; StrategyEditor:97,147,171,211,276,286,364; TacticalEditor:100,112,144,152,162,179,189; UnitPicker:122; PlanScreen:662; MapStringImport:43. Внутри шаблона расхождения: пометка «необязательно» только в трёх блоках TacticalEditor; заголовок-кнопка против простого заголовка; классы `.tactical-editor` и `.unit-picker` в CSS не существуют.

### 3.3 Голова и подвал редакторов — четыре вида

TacticalEditor/AdjustmentEditor: `panel-head` + «Готово» вверху. StrategyEditor:347,369: голый `h2`, кнопки внизу `.strategy-foot`. PlanScreen:661: свой `panel-head` с текстовой «Отмена». UnitPicker:123: `panel-head` + текстовая «Закрыть», подвал `.picker-foot`.

### 3.4 Закрыть/удалить без `HexRemove`

`plan/UnitPicker.tsx:125`, `map/MapStringImport.tsx:45`, `plan/PlanTabs.tsx:72` (удаление плана), `plan/PlanTabs.tsx:85` (удаление раунда «−»), `plan/ExpeditionWidget.tsx:65`, `screens/PlanScreen.tsx:664`. `plan/StrategyEditor.tsx:282` ставит «−» на место `.in-card`, где по соглашению стоит удаление, а делает уменьшение; `plan/TokenTiles.tsx:47` — ещё один вид «−». Оба выражаются через `Stepper`.

### 3.5 Модал собран трижды

`map/HexStage.tsx:345` (без портала), `players/FactionPicker.tsx:53` (портал), `common/ShareConflict.tsx:12` (без Escape и шапки). Скругления 14px и 12px вперемешку.

### 3.6 Выбор игрока (точка цвета + имя) — четыре сборки

`map/HexStage.tsx:383-390, 428-435`; `screens/PlanScreen.tsx:721-739` (занимает класс большого гекса `stage-owners`); `plan/StrategyEditor.tsx:173-181, 213-221` (столбик `.option`); `screens/PlanScreen.tsx:655-659`.

### 3.7 Inline-стиль цвета игрока — 20 мест

`var(--player-${color})` во `style`: HexStage:386,431; StrategyEditor:178,218; PlanScreen:656,657,722,733; EntryList:84,189; EntryUpgrades:23; UpgradesPanel:25; PlayerList:100; SeatMap:99,112; TileView:133,317,331; HexMap:172,184. `MapLegend.tsx:99` жёстко `var(--player-2)`. Нужны `PlayerDot` и `data-player`/`playerVar()`. Геометрию во `style` не трогать.

### 3.8 Почти одинаковые классы

- Плитка юнита с числом — 4 CSS-класса (`.pic`, `.stage-loss`, `.shop-item`, `.upic`) и 5 компонентов (`UnitButton`, кнопка потерь в HexStage:277, ячейка UnitShop:33, `UnitPictures` EntrySteps:16, `Stack` LandingBlock:27). Размеры 62/62/84/32 px.
- Поверхность карточки (`surface-2` + `border` + `radius-s`) повторена в 10 классах; у `.pic` радиус `10px` вместо токена.
- Плавающая карточка: `.tile-popover` и `.map-import`.
- Строка подтверждения — 4 вида: `.player-confirm`, строка сохранения GameScreen:163, `.row` в LayoutPicker:58 и MapStringImport:58.
- Переключатель улучшения — `.upgrade-card` (UpgradesPanel) и `.ship-row-live` (ShipStats).
- Сетка карт стратегии — одна разметка дважды: `StrategyCards.tsx:61-76`, `StrategyEditor.tsx:348-357`.
- Ряды переключателей планет/мест без общего класса (FractureControl:30, TileNumberInput:61, `.te-panel .row`), хотя есть `.chips`.
- `.optional-note` и `.picker-distance` одинаковы; подпись `small` описана 8 раз; кружок игрока — 6 классов; маленькая кнопка — 13 контекстных переопределений.

### 3.9 Повторы и мёртвый CSS

- Повторяющиеся селекторы, поздние перебивают ранние: `.app-body > main` 102/104, `.entry-main` 454/458, `.plan-body` 396/748/818, `.plan-tabs` 376/903/904, `.plan-tab` 377/905, `.map-strip` 364/930, `.map-tools` 368/931, `.hexmap` 266/398, `.drawer-left` 832/834, `.hex-button` 460/883 и др.
- Ранние определения заголовков, перебитые общим правилом 888-900: `.phase-title` 489, `.side-label` 646, `.player-sec` 684, `.picker-title` 562 и др.
- Мёртвое: `.check` 156, `fieldset`/`legend` 158, `.card-text` 432; `.danger` используется (`GameScreen.tsx:166`), но правила нет — «Удалить» выглядит обычной кнопкой.
- `scrollbar-*` повторено 8 раз, шрифт `system-ui…` 6 раз вместо `font: inherit`.

### 3.10 Цвета без переменных — 78 строк после `:root`

`#2a2618` (золотой фон выбранного) ×8, `#17352a` ×3, `#0d1016` (= `--bg`) ×9, оттенки рамки при наведении 6 разных, `#fff` ×26, `#eef1f6` (= `--text`) ×3. `units/sprites.ts:6` повторяет цвета игроков из темы (нужно для canvas) — стоит проверять тестом.

### 3.11 Один и тот же SVG нарисован дважды

Жетон приказа (`TileView.tsx:322`, `MapLegend.tsx:97`), метка ingress, бейдж номера (`HexMap.tsx:136`, `MapLegend.tsx:10`, ещё `OrderHex` в EntryList:131), планета в легенде своя вместо `PlanetMark`. Три генератора вершин гекса: `geometry.ts:13`, `FactionCard.tsx:10`, `SeatMap.tsx:22`.

### 3.12 Три цвета «выбрано» для одной роли

Голубой (`[aria-pressed]`, `.chip`, `.slice`), золотой (`.option`, `.card-cell`, `.pic-taken`, `.upgrade-card.on` …), зелёный (`.hex-button[aria-pressed]`, `.fac-option`, вкладки и шторки). CLAUDE.md закрепляет зелёный только за вкладками и шторками; для переключателей правила нет. **Решение за вами, по прототипу.**

### 3.13 Прочее

Названия дополнений прописаны в 4 местах (`GameScreen.tsx:24`, `MapStringImport.tsx:11`, `FactionComponents.tsx:7`, `FactionPicker.tsx:38`). `LayoutPicker` и `TileNumberInput` берут `.panel`, а потом CSS снимает с неё всё оформление. Уровни заголовков произвольные (`h1` в шторке игроков, `h2` в других шторках, `h4`/`h5` для одного вида).

## 4. Недостающие контейнеры

Каждый — повтор от двух раз, который нельзя выразить существующим контейнером:

1. **`Modal`** — 3 копии. `Drawer` выезжает сбоку и привязан к плану, `TilePopover` — к гексу. Настройки: `title`, `onClose` (Escape, клик вне, `HexRemove`), `size`, портал.
2. **`Section`** — 31 место. Класс есть, компонента нет. `title`, `optional`, `action`, `collapsible`, `warnings`.
3. **`SectionTitle`** — 8 пар «тег + класс» для одного вида.
4. **`PlayerDot` + `playerVar()`** — 9 точек, 20 inline-стилей.
5. **`PlayerChoice`** — 4 места; `Segment` не знает цвет и «Нет», `.option` не знает группу.
6. **`UnitTile`** — 5 компонентов и 4 класса; варианты `take`/`taken`/`loss`/`shop`.
7. **`ConfirmBar`** — 4 вида; с вариантом `danger`.
8. **`DrawerSheet`** — 4 содержимых шторки со своими шапками.
9. **`Popover` с якорем** — `TilePopover` и `.map-import`.
10. **`MapPickButton`** («выбрать на карте») — 4 места с разным видом при одном поведении.

Новый контейнер не нужен: «−» у плиток → `Stepper`; ряды переключателей → `.chips`; сетки выбора → общий CSS `.choice-grid` с модификаторами.

## 5. Вложенность

| Где | Уровней | Рекомендация | Меняет вид |
|---|---|---|---|
| Экспедиция внутри строки записи (`EntryList.tsx:224-233`) | 5 | **отдельное меню**: открывать на месте списка, как Strategy и Adjustment | да |
| Жетоны статуса внутри строки (`EntryList.tsx:66-97`) | 5 | **отдельное меню**, так же | да |
| Подробности тактики (`EntrySteps.tsx:63-122`) | 7 (чтение) | упростить до строк «откуда → куда» с `UnitTile`; полную схему — в поповер | да |
| `TacticalEditor` + `UnitPicker` | 6 | **шаги**: пока открыт перелёт, показывать только его с «Назад» | да |
| `TacticalEditor` целиком | 3, но 7-8 блоков | «Бой» и «Производство» — блоки из одной кнопки; сделать строками `.in-card` | да |
| `StrategyEditor` | 4, очень длинно | **шаги**: (1) карта и свойство, (2) параметры | да |
| `HexStage` | 5-6 | свойства тайла и контроль планеты — **отдельный режим** сегмента или поповер | да |
| `PlanScreen` | — | 13 состояний режимов и `onTileTap` с 8 ветками: один `mapPick` (автомат) и хук подсветки | нет |
| Список действий в подвале (`EntryList.tsx:238`) | 4 | **поповер** над кнопкой вместо раскрытия в подвале | да |
| `GameScreen`, `PlayerList` | 3-5 | в норме; `ConfirmBar`, `SectionTitle`, `DrawerSheet` | мелко |

## 6. Игровая логика в UI

| Где | Что считает | Куда |
|---|---|---|
| `plan/tactical.ts:17-184, 233-256` | весь модуль тактики: потери десанта, источники, маршруты, кто летит сам, `stateInFlight` | `src/domain/tactical.ts`; в UI оставить `systemName`, `flightRoutes` |
| `plan/ExpeditionWidget.tsx:10-19` | `sliceOwners` | `domain/thundersEdge.ts` |
| `screens/PlanScreen.tsx:486-501` | цели карт на карте: Warfare, Diplomacy без Mecatol, Construction без жетона | `domain/strategy.ts` `cardTargets` |
| `screens/PlanScreen.tsx:290-293, 451-509` | годная система TE, цели корректировки, годные источники | домен + хук подсветки |
| `screens/PlanScreen.tsx:74-79, 325-328` | тела новых записей | `domain/newEntry.ts` |
| `screens/PlanScreen.tsx:460-471` | скорость и остаток хода | `domain` `routeHint` |
| `plan/StrategyEditor.tsx:137-141, 154` | Diplomacy: какие планеты, лимит 2 | `domain/strategy.ts` |
| `plan/StrategyEditor.tsx:329-330` | копии `playOf` и `costsStrategyToken` | вызывать домен |
| `plan/TacticalEditor.tsx:47, 57-74` | «нет дока»; летит/груз; что можно высадить; наземные заданы списком | домен; наземность из `pack.units[u].ground` |
| `plan/UnitPicker.tsx:62-88` | доступно за вычетом других маршрутов | домен |
| `plan/EntrySteps.tsx:69-87` | кто на борту, перегруз (копия `capacityGroup`) | домен / предупреждения |
| `map/HexStage.tsx:131, 135-174, 216, 313-321` | `holderOf` (копия TileView:199), наземные соперника, автооплата производства, перебор | домен |
| `map/TileView.tsx:201-223` | сборка стеков | `domain` `stacksOf` |
| `plan/LandingBlock.tsx:55-59` | кто остался после потерь | домен |
| `plan/TokenTiles.tsx:23-31` | перераспределение Warfare | `domain/strategy.ts` |
| `map/LayoutPicker.tsx:9-11, 38-39` | раскладки и число гиперпутей | `domain/mapBuilder.ts` |
| `players/FactionPicker.tsx:37-41` | группировка фракций через три `loadPack` | `domain/factionSheet.ts` |
| `screens/GameScreen.tsx:102-103` | смена id при импорте | `storage/transfer.ts` |

## 7. Задачи Фазы 2

**[вид]** — меняется раскладка или внешний вид: сначала прототип на утверждение.

**A. Переносы без видимых изменений**
1. `plan/tactical.ts` → `src/domain/tactical.ts`; убрать импорт UI из `domain/mapString.test.ts`.
2. Остальная логика из раздела 6 — по задаче на пункт.
3. `StrategyEditor` вызывает `playOf`/`costsStrategyToken`.
4. Код предупреждения «нет базы» в домене (совпадает с тестом `67 / 79`).
5. Один `TokenPicture`; `HexRemove`/`RowIcon` → `primitives/`; `motion.ts`; `preferences.ts`; `NoteField` отдельно.
6. Раскладка по каталогам (1.2).
7. Названия дополнений в одном месте.
8. `PlanScreen`: хуки подсветки и перелёта, один `mapPick`.

**B. Контейнеры, разметка и классы прежние**
9. `WarningList` с `variant` и `message`; все предупреждения через него.
10. `Section`, `SectionTitle`, `PlayerDot`/`playerVar()`.
11. Чистка CSS (3.9, 3.10): токены выбранного и наведения, `.scroll`, `font: inherit`, мёртвое.
12. `DrawerSheet`, `Modal`. **[вид, мелко]**: шапка шторки игроков, Escape у ShareConflict.

**C. Нужен прототип [вид]**
13. Одно правило цвета «выбрано».
14. Одна голова и один подвал редактора; `HexRemove` вместо текстовых «Закрыть»/«Удалить»; `Stepper` вместо «−».
15. `UnitTile`, `ConfirmBar` (+`danger`), `button.small`, `PlayerChoice`, `MapPickButton`.
16. Вложенность из раздела 5.
17. Легенда теми же компонентами, что карта.
