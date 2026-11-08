# План Фазы 2

Собрано скриптом `npm run plan:todos` из комментариев `TODO(P2-…)` в коде. Не правьте этот файл руками: правьте TODO и запустите скрипт снова.

Всего: **52** TODO в **27** файлах, **25** потоков.

## По типам

| Тип | Значение | Количество |
|---|---|---|
| `bug` | Ошибка: код делает то, что правило запрещает | 1 |
| `arch` | Архитектура: ответственность не на месте | 3 |
| `dup` | Дублирование | 22 |
| `ui` | Визуальный язык: элемент вне общего контейнера | 22 |
| `vocab` | Термины игры | 2 |
| `doc` | Документация | 2 |

## Волны

Поток стоит на волну позже самого позднего из тех, на чей результат он опирается. Потоки одной волны независимы: их можно делать параллельно, у каждого свои файлы.

**Волна 0:** [rule-engine](#ws-rule-engine) (0), [domain-purity](#ws-domain-purity) (0), [data](#ws-data) (0), [ui-structure](#ws-ui-structure) (0), [ui-css](#ws-ui-css) (2), [vocab](#ws-vocab) (2), [docs](#ws-docs) (2)

**Волна 1:** [replay-steps](#ws-replay-steps) (0), [ui-logic-to-domain](#ws-ui-logic-to-domain) (0), [ui-warnings](#ws-ui-warnings) (1), [ui-containers](#ws-ui-containers) (34)

**Волна 2:** [command-tokens](#ws-command-tokens) (0), [movement](#ws-movement) (1), [transport](#ws-transport) (0), [combat-order](#ws-combat-order) (0), [invasion](#ws-invasion) (0), [structures](#ws-structures) (0), [production](#ws-production) (0), [payment](#ws-payment) (0), [strategy-cards](#ws-strategy-cards) (0), [round-flow](#ws-round-flow) (0), [thunders-edge](#ws-thunders-edge) (0), [ui-nesting](#ws-ui-nesting) (10), [ui-plan-screen](#ws-ui-plan-screen) (0)

**Волна 3:** [rivals](#ws-rivals) (0)

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
| P2-552 | dup |  | [src/ui/theme.css:699](../../src/ui/theme.css#L699) | заголовок LayoutPicker собран своим правилом, а не общим заголовком раздела 959: перейти на общий — P2 note: the common heading draws lines on both sides, so moving the LayoutPicker title to it changes the page; it also needs the markup (P2-570, ui-containers) | #section-title | s | ~~P2-570~~ ✓ |
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

_Нет TODO._

<a id="ws-ui-warnings"></a>
### Показ нарушений · `ui-warnings` · волна 1

**Цель.** Все нарушения показывает WarningList; раскладка по шагу и месту из домена, не по коду; остаток вверху редактора.

**Опирается на:** `rule-engine`

**Файлы потока:** `src/ui/plan/WarningText.tsx`, `src/ui/plan/warningPlaces.ts`

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-210 | dup |  | [src/ui/map/stage/HexStage.tsx:279](../../src/ui/map/stage/HexStage.tsx#L279) | Перебор ресурсов, флота и вместимости решает сам (over, класс stage-meter-over): красить счётчики по кодам shortResources/fleetPool/capacitySystem записи — P2 note: an entry's meters now read its codes; a manual build (adjustment of kind build) has no rule check in the domain (applyAdjustment checks no fleet pool, capacity or cost), so without an entry the counters still compare themselves until the domain checks a manual build | #warning-channel #duplicate-of-domain | m |  |

<a id="ws-ui-containers"></a>
### Контейнеры визуального языка · `ui-containers` · волна 1

**Цель.** Section, SectionTitle, PlayerDot, PlayerChoice, UnitTile, ConfirmBar, Modal, DrawerSheet, Popover, MapPickButton вместо ручных сборок.

**Опирается на:** `ui-structure`

**Файлы потока:** `src/ui/primitives/*`, `src/ui/overlays/*`

**Нужно ваше решение или прототип:** P2-243 (prototype), P2-250 (prototype), P2-253 (prototype), P2-261 (prototype), P2-264 (prototype), P2-247 (prototype), P2-319 (prototype), P2-323 (prototype), P2-329 (prototype), P2-332 (prototype), P2-334 (prototype), P2-340 (prototype), P2-362 (prototype), P2-371 (prototype), P2-383 (prototype), P2-427 (prototype), P2-436 (prototype)

Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.

| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |
|---|---|---|---|---|---|---|---|
| P2-356 | arch |  | [src/ui/plan/editors/ExpeditionEditor.tsx:28](../../src/ui/plan/editors/ExpeditionEditor.tsx#L28) | флаг ручной оплаты хранится здесь, а TacticalEditor и StrategyEditor получают его от PlanScreen; одно место для всех PaymentBlock — P2 note: the one place is PlanScreen's manualPayments, which the big hex reads too; the expedition editor sits inside the entry row (EntryList), so the flag would travel through EntryList and PlanScreen state, both edited by ui-plan-screen now (P2-429 merges the two toggles there): left for that wave |  | s |  |
| P2-240 | dup |  | [src/ui/drawers/MapLegend.tsx:103](../../src/ui/drawers/MapLegend.tsx#L103) | Значок места свёрстан заново с жёстким var(--player-2) во style: тот же значок, что на тайле — P2 note: the colour now comes through playerStyle; the tile's own SVG seat mark is smaller and drawn in the tile's scale, so putting it here changes how the legend looks: needs prototype | #player-colour #inline-style #legend | s | ~~P2-224~~ ✓ |
| P2-243 | dup |  | [src/ui/drawers/MapLegend.tsx:31](../../src/ui/drawers/MapLegend.tsx#L31) | Своя планета легенды вместо PlanetMark из TileView: легенда расходится с картой; рисовать PlanetMark | #legend #planet | s |  |
| P2-248 | dup |  | [src/ui/map/builder/MapStringImport.tsx:41](../../src/ui/map/builder/MapStringImport.tsx#L41) | Плавающая карточка .map-import повторяет .tile-popover, а panel-head собран руками: Popover с якорем и Section — P2 note: Popover exists (overlays/Popover.tsx, TilePopover uses it) and the card's look is one rule with .tile-popover; anchoring this panel would move it beside the paste button and close it on an outside press, and its head holds the text Close of P2-247: needs prototype | #popover #section | m | ~~P2-259~~ ✓ |
| P2-250 | dup |  | [src/ui/map/builder/MapStringImport.tsx:60](../../src/ui/map/builder/MapStringImport.tsx#L60) | Строка подтверждения .row (текст, «Заменить», «Отмена») — четвёртый вид после player-confirm, GameScreen и LayoutPicker: ConfirmBar | #confirm-bar | s |  |
| P2-253 | dup |  | [src/ui/map/builder/LayoutPicker.tsx:52](../../src/ui/map/builder/LayoutPicker.tsx#L52) | Строка подтверждения .row собрана руками: ConfirmBar | #confirm-bar | s | P2-250 |
| P2-261 | dup |  | [src/ui/map/stage/UnitShop.tsx:24](../../src/ui/map/stage/UnitShop.tsx#L24) | Ячейка .shop-item — одна из пяти плиток юнита с числом (UnitTile take/taken/loss/mini/stack in ui/units): UnitTile с вариантами take/taken/loss/shop | #unit-tile | m |  |
| P2-264 | dup |  | [src/ui/drawers/UpgradesPanel.tsx:32](../../src/ui/drawers/UpgradesPanel.tsx#L32) | Переключатель улучшения .upgrade-card повторяет .ship-row-live из ShipStats: один вид | #upgrade-toggle | s |  |
| P2-352 | dup |  | [src/ui/plan/EntryList.tsx:120](../../src/ui/plan/EntryList.tsx#L120) | бейдж номера нарисован третий раз (HexMap, MapLegend); один компонент — P2 note: the map and the legend now share RouteBadge; this one is an HTML number over a 12-wide hexagon in the row's own colours, and drawing the map's SVG badge here changes how the row looks: needs prototype |  | s |  |
| P2-512 | dup |  | [src/ui/theme.css:216](../../src/ui/theme.css#L216) | маленькая кнопка: 14 контекстных переопределений padding/min-height/font-size: 180, 226, 251, 398, 401, 418, 433, 440, 547, 576, 636, 701, 712, 739; модификатор .small или проп у кнопки — P2 note: the fourteen overrides differ (padding 4/5 px by 8/10/14 px, heights 32/36 px, 12/13 px text), so one .small modifier changes most of them: needs prototype | #small-button | m |  |
| P2-515 | dup |  | [src/ui/theme.css:265](../../src/ui/theme.css#L265) | кружок игрока собран в 6 классах: .owner-dot, .status-player ::before 554, .player-badge 723, .seat-ghost-badge 805, .legend-dot 932, .legend-seat 933; компонент PlayerDot с размером — P2 note: PlayerDot (primitives/player.tsx) now draws .owner-dot everywhere and the ghost badge; the others keep their own look and notes: the stepper dot P2-542, the card badge P2-554, the legend P2-568 | #player-dot | m |  |
| P2-517 | dup |  | [src/ui/theme.css:274](../../src/ui/theme.css#L274) | коробка модала трижды: .stage-dialog, .link-dialog 603, .fac-sheet 1012, скругления 14px и var(--radius) вперемешку; общий Modal — P2 note: the three boxes now come from one Modal (overlays/Modal.tsx); their sizes, padding, background (the sheet of factions sits on --bg) and corners still differ, and one box would change two of them: needs prototype | #modal | m |  |
| P2-520 | dup |  | [src/ui/theme.css:286](../../src/ui/theme.css#L286) | .shop-item (84px) ещё одна плитка юнита с числом: перейти на общий UnitTile — P2 note: the shop cell is P2-261, which needs prototype; UnitTile (units/UnitTile.tsx) has no shop variant yet | #unit-tile | s | P2-548 |
| P2-542 | dup |  | [src/ui/theme.css:553](../../src/ui/theme.css#L553) | кружок игрока через ::before: перейти на PlayerDot — P2 note: the dot stands inside the name of a Stepper, whose name is also the accessible name of the group: an element there needs a slot in Stepper and changes nothing visible, so it waits for the Stepper rework | #player-dot | s | P2-515 |
| P2-548 | dup |  | [src/ui/theme.css:607](../../src/ui/theme.css#L607) | плитка юнита с числом: 4 класса (.pic, .shop-item 254, .stage-loss 268, .upic 524) и 5 компонентов, размеры 62/84/62/32, бейдж числа 257, 270, 617, 525; общий UnitTile с размером, радиус var(--radius-s) вместо 10px — P2 note: UnitTile now draws .pic, .stage-loss, .upic and the landing stacks, with the sizes they had; one size, one counter badge and var(--radius-s) for all would change how each looks: needs prototype | #unit-tile | m |  |
| P2-549 | dup |  | [src/ui/theme.css:672](../../src/ui/theme.css#L672) | .map-import повторяет .tile-popover: перейти на общий Popover — P2 note: the look of the card is shared now (one rule with .tile-popover); the Popover itself would anchor the panel beside the paste button and close it on a press outside, a change of place and behaviour: needs prototype, with P2-248 | #floating-card | s | ~~P2-513~~ ✓ |
| P2-554 | dup |  | [src/ui/theme.css:710](../../src/ui/theme.css#L710) | .player-badge: кружок игрока большого размера, перейти на PlayerDot — P2 note: the card badge takes its colour from the card (--player), animates when a seat is bumped and stays a block of 38 px with the seat number: moving it to PlayerDot changes no look and adds an inline colour, left as is | #player-dot | s | P2-515 |
| P2-556 | dup |  | [src/ui/theme.css:721](../../src/ui/theme.css#L721) | строка подтверждения: .player-confirm, строка сохранения GameScreen:163, .row в LayoutPicker и MapStringImport; общий ConfirmBar — P2 note: ConfirmBar (primitives/ConfirmBar.tsx) now draws .player-confirm and the save row of GameScreen; the rows of LayoutPicker and MapStringImport are P2-253 and P2-250, which need prototype | #confirm-bar | m |  |
| P2-562 | dup |  | [src/ui/theme.css:813](../../src/ui/theme.css#L813) | переключатель улучшения дважды: .ship-row-live и .upgrade-card 855 (рамка, gold при выборе, disabled без затухания); один компонент — P2 note: one toggle for both needs the look of P2-264, which needs prototype | #upgrade-toggle | m |  |
| P2-563 | dup |  | [src/ui/theme.css:831](../../src/ui/theme.css#L831) | .upgrade-card повторяет .ship-row-live 836: перейти на общий переключатель — P2 note: waits for P2-562 and P2-264 (prototype) | #upgrade-toggle | s | P2-562 |
| P2-568 | dup |  | [src/ui/theme.css:899](../../src/ui/theme.css#L899) | .legend-dot и .legend-seat 933: кружок игрока, перейти на PlayerDot — P2 note: the legend dots are technology and trait colours, not players (they use modifier classes now, P2-245); the seat mark is P2-240: needs prototype | #player-dot | s | P2-515 |
| P2-247 | ui |  | [src/ui/map/builder/MapStringImport.tsx:46](../../src/ui/map/builder/MapStringImport.tsx#L46) | Текстовая кнопка «Закрыть»: HexRemove, как везде | #close-button | s |  |
| P2-319 | ui |  | [src/ui/plan/editors/TacticalEditor.tsx:184](../../src/ui/plan/editors/TacticalEditor.tsx#L184) | голова и подвал редакторов четырёх видов (здесь panel-head и «Готово» вверху, у StrategyEditor h2 и подвал, у UnitPicker текстовое «Закрыть»); класса .tactical-editor в CSS нет. Одна рамка редактора | #editor-frame | m |  |
| P2-323 | ui |  | [src/ui/plan/editors/UnitPicker.tsx:117](../../src/ui/plan/editors/UnitPicker.tsx#L117) | текстовое «Закрыть» вместо HexRemove; «Удалить источник» в подвале повторяет крестик строки источника |  | m | P2-319 |
| P2-329 | ui |  | [src/ui/plan/editors/cards/politics.tsx:8](../../src/ui/plan/editors/cards/politics.tsx#L8) | выбор игрока (точка цвета + имя, inline var(--player-…)) собран руками здесь, в Trade ниже, в HexStage и PlanScreen; общий PlayerChoice с PlayerDot | #player-choice | m |  |
| P2-332 | ui |  | [src/ui/plan/editors/cards/technology.tsx:21](../../src/ui/plan/editors/cards/technology.tsx#L21) | «−» на месте .in-card, где по соглашению удаление, а делает уменьшение; Stepper |  | s |  |
| P2-334 | ui |  | [src/ui/plan/editors/StrategyEditor.tsx:158](../../src/ui/plan/editors/StrategyEditor.tsx#L158) | голый h2 и подвал .strategy-foot вместо общей рамки редактора |  | m | P2-319 |
| P2-340 | ui |  | [src/ui/plan/blocks/TokenTiles.tsx:40](../../src/ui/plan/blocks/TokenTiles.tsx#L40) | ещё один вид «−»; Stepper |  | s | P2-332 |
| P2-362 | ui |  | [src/ui/plan/editors/AdjustmentEditor.tsx:43](../../src/ui/plan/editors/AdjustmentEditor.tsx#L43) | чужой класс .tactical-editor (которого нет в CSS), своя голова и ручные блоки; общая рамка редактора и Section |  | m | P2-319, ~~P2-316~~ ✓ |
| P2-371 | ui |  | [src/ui/drawers/ExpeditionWidget.tsx:53](../../src/ui/drawers/ExpeditionWidget.tsx#L53) | текстовое «Убрать» вместо HexRemove |  | m | P2-323 |
| P2-383 | ui |  | [src/ui/plan/PlanTabs.tsx:95](../../src/ui/plan/PlanTabs.tsx#L95) | удаление плана текстовой кнопкой и раунда «−» ниже вместо HexRemove |  | m |  |
| P2-427 | ui |  | [src/ui/screens/PlanScreen.tsx:502](../../src/ui/screens/PlanScreen.tsx#L502) | своя голова редактора с текстовой «Отмена» вместо общей головы редактора и HexRemove (аудит 3.3, 3.4) | #editor-head | s |  |
| P2-436 | ui |  | [src/ui/screens/GameScreen.tsx:155](../../src/ui/screens/GameScreen.tsx#L155) | своя строка подтверждения удаления, ещё один вид рядом с .player-confirm и строками LayoutPicker/MapStringImport: общий ConfirmBar | #confirm-bar | s |  |
| P2-452 | ui |  | [src/ui/common/ShareConflict.tsx:13](../../src/ui/common/ShareConflict.tsx#L13) | модал собран руками (.stage + .link-dialog) без Escape и шапки с HexRemove, третья копия рядом с HexStage и FactionPicker: общий Modal (аудит 3.5) — P2 note: now the shared Modal; a head with HexRemove (and Escape closing it) would add a third way out of the choice and a new head row: needs prototype | #modal | s |  |

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

_Нет TODO._

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
| P2-200 | arch |  | [src/ui/map/stage/HexStage.tsx:71](../../src/ui/map/stage/HexStage.tsx#L71) | 440 строк: модал, три режима, правка чужих юнитов, оплата производства и счётчики в одном компоненте; разделить на оболочку и панели setup/battle/build, покупки вынести в хук | #hex-stage #srp | l |  |
| P2-428 | arch |  | [src/ui/screens/PlanScreen.tsx:509](../../src/ui/screens/PlanScreen.tsx#L509) | редакторы и список взаимоисключаются цепочкой !session && !cardEntry && ..., редактор вложен в панель, UnitPicker и HexStage ещё глубже: один слот панели по состоянию автомата, шаги или отдельное меню по прототипу | #nesting | l | ~~P2-400~~ ✓ |
| P2-217 | ui |  | [src/ui/map/stage/HexStage.tsx:380](../../src/ui/map/stage/HexStage.tsx#L380) | Свойства тайла и контроль планеты лежат пятым-шестым уровнем под режимом: отдельный режим сегмента или поповер | #nesting #hex-stage | m |  |
| P2-317 | ui |  | [src/ui/plan/editors/TacticalEditor.tsx:142](../../src/ui/plan/editors/TacticalEditor.tsx#L142) | «Бой» и «Производство» — блоки из одной кнопки; сделать строками .in-card |  | m | ~~P2-316~~ ✓ |
| P2-318 | ui |  | [src/ui/plan/editors/TacticalEditor.tsx:134](../../src/ui/plan/editors/TacticalEditor.tsx#L134) | UnitPicker раскрывается внутри редактора (6 уровней); шаги: пока открыт перелёт, показывать только его с «Назад» |  | m |  |
| P2-337 | ui |  | [src/ui/plan/editors/StrategyEditor.tsx:155](../../src/ui/plan/editors/StrategyEditor.tsx#L155) | редактор длинный, 4 уровня; шаги: (1) карта и свойство, (2) параметры |  | m |  |
| P2-346 | ui |  | [src/ui/plan/EntrySteps.tsx:60](../../src/ui/plan/EntrySteps.tsx#L60) | подробности тактики 7 уровней; строки «откуда → куда» с UnitTile, полная схема в поповере |  | m |  |
| P2-349 | ui |  | [src/ui/plan/EntryList.tsx:55](../../src/ui/plan/EntryList.tsx#L55) | жетоны статуса раскрываются внутри строки записи (5 уровней); отдельное меню на месте списка, как Strategy и Adjustment |  | m |  |
| P2-355 | ui |  | [src/ui/plan/EntryList.tsx:213](../../src/ui/plan/EntryList.tsx#L213) | экспедиция раскрывается внутри строки (5 уровней); отдельное меню, как жетоны статуса |  | m | P2-349 |
| P2-357 | ui |  | [src/ui/plan/ActionMenu.tsx:17](../../src/ui/plan/ActionMenu.tsx#L17) | список действий раскрывается в подвале списка записей (4 уровня); поповер над кнопкой |  | m |  |

<a id="ws-ui-plan-screen"></a>
### Экран плана · `ui-plan-screen` · волна 2

**Цель.** Один автомат выбора на карте вместо 13 состояний; подсветка и перелёт в отдельных хуках.

**Опирается на:** `ui-logic-to-domain`

**Файлы потока:** `src/ui/screens/PlanScreen.tsx`

_Нет TODO._

<a id="ws-rivals"></a>
### Соперники в общей картине · `rivals` · волна 3

**Цель.** Маршруты и блокировки видят действия соперников по плану; взгляд соперника видит мои корабли; списки выбора на картах соперника верны.

**Опирается на:** `replay-steps`, `movement`

**Файлы потока:** `src/domain/players.ts (gameAs)`, `src/domain/project.ts (rival replay)`

_Нет TODO._

## По правилам

| Правило | TODO |
|---|---|
| 6-note-2 | P2-011 |
| 83.3 | P2-063 |

## По слоям и тегам

Слои: domain 1, i18n 2, docs 2, ui 47.

Теги: #confirm-bar 4, #player-dot 4, #unit-tile 3, #upgrade-toggle 3, #i18n 2, #warning-channel 2, #hex-stage 2, #nesting 2, #legend 2, #modal 2, #Creuss 1, #comments 1, #for-token 1, #srp 1, #duplicate-of-domain 1, #player-colour 1, #inline-style 1, #planet 1, #close-button 1, #popover 1, #section 1, #editor-frame 1, #player-choice 1, #editor-head 1, #selected-state 1, #small-button 1, #floating-card 1, #section-title 1.
