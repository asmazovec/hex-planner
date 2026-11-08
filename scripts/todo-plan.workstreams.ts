/**
 * Phase 2 workstreams: independent responsibilities, each fixable on its own, in parallel within a wave.
 * A TODO names its workstream with `#ws:<id>`; `scripts/todo-plan.ts` groups the TODOs by these and writes the plan.
 * `after` lists the workstreams whose result this one builds on; the waves follow from it.
 */
export interface Workstream {
  id: string;
  title: string;
  /** What is true when the workstream is done. */
  goal: string;
  after: string[];
  /** Files the workstream owns: two workstreams of one wave should not share them. */
  owns: string[];
}

export const WORKSTREAMS: Workstream[] = [
  // Wave 0: the foundation others build on.
  { id: 'rule-engine', title: 'Нарушения правил как отдельный канал', after: [],
    goal: 'Тип нарушения с номером правила, шагом действия и местом возникновения; реестр проверок по шагам; контрактные тесты: у каждого правила есть тест, у каждого шага есть место показа, UI не создаёт нарушений.',
    owns: ['src/domain/types.ts (Warning)', 'src/domain/rules/registry.ts (new)', 'src/domain/rules/contract.test.ts (new)'] },
  { id: 'replay-steps', title: 'Повтор плана по шагам правил', after: ['rule-engine'],
    goal: 'replay разложен на фазы раунда и шаги тактического действия (89.1-89.5) и карт; каждый шаг: проверки над состоянием до шага, затем чистый эффект. Фаза статуса применяется в своей фазе.',
    owns: ['src/domain/project.ts (replay, applyEntry, applyTactical)'] },
  { id: 'domain-purity', title: 'Чистота домена', after: [],
    goal: 'Домен без случайностей и часов, без геометрии отрисовки, без импорта из UI и без цикла с data.',
    owns: ['src/domain/newGame.ts', 'src/domain/route.ts', 'src/domain/cards.ts', 'src/domain/mapString.test.ts'] },
  { id: 'data', title: 'Игровые данные', after: [],
    goal: 'В пакетах есть то, что требуют правила: состав набора (96.2), Production базы, уровни Infantry II, War Sun, PDS II, Space Dock II, выходы Излома; с указанием источника.',
    owns: ['scripts/build-data.ts', 'src/data/packs/*.json', 'src/data/provenance.json'] },

  // Wave 1: rules by step, in parallel.
  { id: 'command-tokens', title: 'Жетоны приказа и активация', after: ['replay-steps'],
    goal: 'Активация (89.1), тактический резерв (20.4), 16 жетонов (20.3), жетон в систему со своим жетоном (20.6), сжатие резерва флота (37.3, 81.5.1).',
    owns: ['src/domain/project.ts (activation, statusTokens)'] },
  { id: 'movement', title: 'Движение и маршруты', after: ['replay-steps'],
    goal: 'Граф маршрутов в своём модуле; проверка всего пути, а не только отмеченных точек; разлом +1 за каждый; дом вне карты (Creuss); гиперпуть не система; подсветка возврата в активную систему.',
    owns: ['src/domain/movement.ts (new, from project.ts)', 'src/domain/route.ts (graph part)'] },
  { id: 'transport', title: 'Перевозка и подбор', after: ['replay-steps'],
    goal: 'Подбор только из старта, пути и активной системы, не из системы со своим жетоном (95.1, 95.3); брошенные без мест на борту юниты в системах, откуда улетели (16.3, 43.1, 95 примечание 4).',
    owns: ['src/domain/transport.ts (new)', 'src/ui/plan/UnitPicker.tsx (offer)'] },
  { id: 'combat-order', title: 'Порядок проверок вокруг боя', after: ['replay-steps'],
    goal: 'Флот проверяется при прилёте, до боя (37.3); высадка не больше мест на борту после боя (16.3.3); возврат ошибочной потери возвращает высадку.',
    owns: ['src/domain/project.ts (landAndBuild order)', 'src/ui/plan/tactical.ts (withLoss)'] },
  { id: 'invasion', title: 'Вторжение и контроль', after: ['replay-steps'],
    goal: 'Контроль только при выживших войсках (49.5), у меня и у соперника; высадка только наземных войск и только в активной системе; планета, взятая у соперника, уходит из его счёта.',
    owns: ['src/domain/project.ts (landUnits, rival landings)'] },
  { id: 'structures', title: 'Строения и их владельцы', after: ['replay-steps', 'data'],
    goal: 'У базы и PDS есть владелец; они уничтожаются при захвате планеты (49.5.1, 63.4, 79.4); лимиты на планете (85.4-85.6).',
    owns: ['src/domain/types.ts (docks, pds)', 'src/storage/schema.ts (migration)'] },
  { id: 'production', title: 'Производство', after: ['replay-steps', 'data'],
    goal: 'Место производства (68.3, 67.4.1); блокада и чужие корабли (14.1, 67.6); нет базы как нарушение домена; лимит Production (68.1); запас отрядов (67.5).',
    owns: ['src/domain/production.ts (new, from project.ts)'] },
  { id: 'payment', title: 'Оплата', after: ['replay-steps'],
    goal: 'Оплата и подготовка только своими планетами (34 примечание 2, 64 примечание 5, 71 примечание 3).',
    owns: ['src/domain/payment.ts', 'src/domain/project.ts (pay)'] },
  { id: 'strategy-cards', title: 'Карты стратегии', after: ['replay-steps'],
    goal: 'Обработчик на каждую карту вместо цепочки if; кто какое свойство какой карты может применить (83.3, 83.4, 82); forToken выводится из карт раунда; Imperial, Warfare, Trade, Diplomacy, Construction, Technology по правилам.',
    owns: ['src/domain/strategy.ts', 'src/domain/cards/*.ts (new)', 'src/ui/plan/StrategyEditor.tsx (logic only)'] },
  { id: 'round-flow', title: 'Ход раунда', after: ['replay-steps'],
    goal: 'Пас и действия после паса (3.3, 3.4, 82.2); действие не в своей фазе (40.2).',
    owns: ['src/domain/round.ts (new)'] },
  { id: 'rivals', title: 'Соперники в общей картине', after: ['replay-steps', 'movement'],
    goal: 'Маршруты и блокировки видят действия соперников по плану; взгляд соперника видит мои корабли; списки выбора на картах соперника верны.',
    owns: ['src/domain/players.ts (gameAs)', 'src/domain/project.ts (rival replay)'] },
  { id: 'thunders-edge', title: "Thunder's Edge", after: ['replay-steps', 'data'],
    goal: 'Экспедиция (часть технологий, повтор, одна за ход), энтропийный шрам, станции, входы и выходы Излома.',
    owns: ['src/domain/thundersEdge.ts', 'src/domain/payment.ts (EXPEDITION_SLICES)'] },
  { id: 'ui-logic-to-domain', title: 'Логика из UI в домен', after: ['rule-engine'],
    goal: 'Правила, посчитанные в UI, живут в домене: tactical.ts, цели карт, доступные к подбору, перегруз, нет базы, перераспределение жетонов, стеки тайла.',
    owns: ['src/ui/plan/tactical.ts → src/domain/tactical.ts', 'src/ui/screens/PlanScreen.tsx (highlight logic)'] },

  // UI, from the UI audit.
  { id: 'ui-warnings', title: 'Показ нарушений', after: ['rule-engine'],
    goal: 'Все нарушения показывает WarningList; раскладка по шагу и месту из домена, не по коду; остаток вверху редактора.',
    owns: ['src/ui/plan/WarningText.tsx', 'src/ui/plan/warningPlaces.ts'] },
  { id: 'ui-structure', title: 'Каталоги UI', after: [],
    goal: 'Однородные элементы в тематических каталогах (primitives, feedback, overlays, drawers, plan/editors, plan/blocks); общие примитивы не в фичевых папках.',
    owns: ['src/ui/** (moves only)'] },
  { id: 'ui-containers', title: 'Контейнеры визуального языка', after: ['ui-structure'],
    goal: 'Section, SectionTitle, PlayerDot, PlayerChoice, UnitTile, ConfirmBar, Modal, DrawerSheet, Popover, MapPickButton вместо ручных сборок.',
    owns: ['src/ui/primitives/*', 'src/ui/overlays/*'] },
  { id: 'ui-css', title: 'Тема', after: [],
    goal: 'Цвета только переменными, без дублей селекторов и мёртвых правил; общие утилиты.',
    owns: ['src/ui/theme.css'] },
  { id: 'ui-nesting', title: 'Вложенность экранов (нужен прототип)', after: ['ui-containers'],
    goal: 'Не больше трёх уровней: шаги, отдельное меню, модал или шторка там, где глубже. Каждое изменение раскладки сначала прототипом на утверждение.',
    owns: ['src/ui/plan/*Editor.tsx', 'src/ui/map/HexStage.tsx', 'src/ui/plan/EntryList.tsx'] },
  { id: 'ui-plan-screen', title: 'Экран плана', after: ['ui-logic-to-domain'],
    goal: 'Один автомат выбора на карте вместо 13 состояний; подсветка и перелёт в отдельных хуках.',
    owns: ['src/ui/screens/PlanScreen.tsx'] },
  { id: 'vocab', title: 'Термины игры', after: [],
    goal: 'npm run lint:terms без ошибок и предупреждений: термины Rules Reference и Hobby World, названия по-английски.',
    owns: ['src/i18n/*.json', 'comments'] },
  { id: 'docs', title: 'Документация', after: [],
    goal: 'CLAUDE.md не противоречит правилам (разлом, forToken) и описывает новый канал нарушений.',
    owns: ['CLAUDE.md'] },
];
