# Глоссарий перевода текстов Prophecy of Kings и Codex (`src/data/texts/pok.ru.json`)

Источники:

- **RR** — русский справочник правил Hobby World 2021 (`TI07_Rules_Reference_RU_2021_web-min.pdf` в корпусе knowledge-rag), номер — параграф справочника. В нём только базовая игра (п. 1-89): лидеров, мехов, исследования, реликвий и легендарных планет там нет.
- **CLAUDE.md / Vale** — раздел «Данные и язык» и `.vale/styles/TI4Ru/Terms.yml`.
- **ru.json** — слова русского интерфейса проекта (`src/i18n/ru.json`).
- **TE** — решение, уже принятое в `docs/phase3/ru-glossary-te.md`; взято без изменений, чтобы файлы не разошлись.
- **мой** — нет в справочнике, перевод мой.

Там, где проект и справочник расходятся, взят термин проекта (юнит, истощить, обязательство, домашняя система, спасовать). Текст, который дословно совпадает с текстом из `te.json`, берётся из `te.ru.json` (49 записей: карты стратегии, восемь технологий, условия героев, командир Jol-Nar).

## Термины

| Английский | Русский | Откуда |
| --- | --- | --- |
| command token | жетон приказа | RR 18; CLAUDE.md / Vale |
| tactic pool / fleet pool / strategy pool | тактический резерв / резерв флота / стратегический резерв | RR 50, 66; CLAUDE.md / Vale |
| token from your strategy pool | жетон приказа из своего стратегического резерва | Vale; TE |
| command sheet | планшет приказов | RR 50 |
| fleet limit | максимальный размер флота | RR 33.2 |
| reinforcements | снабжение | RR 71; Vale |
| supply (trade goods from the supply) | общий запас | RR, подготовка, шаг 9 |
| unit | юнит | CLAUDE.md, ru.json (в RR 43 «отряд») |
| ship / non-fighter ship | корабль / корабль, кроме истребителей | RR 33; TE |
| ground forces | наземные войска (один: юнит наземных войск) | RR 40; CLAUDE.md / Vale |
| infantry | пехота (1 пехота, 2 пехоты, до 3 пехот) | RR 17; счёт как в TE |
| mech | мех (кого: меха) | ru.json; в RR нет |
| fighter, cruiser, destroyer, dreadnought, war sun, flagship | истребитель, крейсер, эсминец, дредноут, солнце войны, флагман | RR 33, 43.2 |
| PDS / space dock | ПСО / база | RR 64, 5; CLAUDE.md / Vale |
| structure | сооружение | RR 72 |
| space area | космос (системы) | RR 11.2, 33.1 |
| game board / edge of the game board | игровое поле / край игрового поля | RR 21 / мой |
| system tile | тайл системы | ru.json; TE (в RR «фрагмент поля») |
| exhaust / exhausted | истощить / истощён | ru.json; TE (в RR 45 «перевернуть») |
| ready / readied | подготовить / подготовленный | RR 53 |
| flip (card, token) | перевернуть | TE |
| purge | убрать из игры | RR 16; TE |
| remove | убрать | RR 16.2 |
| discard / discard pile | сбросить / стопка сброса | RR 24.7 |
| draw / reveal / look at | взять / раскрыть / посмотреть | RR 24.3, 84.2, 28.4 |
| shuffle back | замешать обратно | RR, подготовка |
| hand | рука | RR 24.3, 25.5 |
| play area / common play area | игровая зона / общая игровая зона | RR 26.4 |
| faceup | лицевой стороной вверх | RR, подготовка |
| faction sheet | планшет фракции | RR, подготовка |
| control marker | жетон контроля | RR 32 |
| faction ability / unit ability / text ability | фракционная способность / способность юнита / текстовая способность | RR 74 / TE |
| printed abilities | напечатанные способности | RR 29.1 «напечатанное» |
| action card | карта действия | RR 24 |
| play (an action card) | сыграть | RR 24.5 |
| promissory note | обязательство | ru.json; TE (в RR 25 «карта обещания») |
| agenda / agenda deck | карта политики / колода политики | RR 26 |
| law | закон | RR 26.2 |
| vote / cast votes / additional votes | голосовать / отдать голоса / дополнительные голоса | RR 83.5, 83.15 |
| abstain | отказаться голосовать | RR 83.14 |
| outcome | вариант решения | RR 83.17 |
| For / Against | За / Против | RR 26.3, 26.6 |
| elect / elected player | выбрать / выбранный игрок | RR 83.10 |
| predict (aloud) an outcome | (вслух) предсказать вариант решения | RR 83.22 |
| speaker / speaker token | председатель / жетон председателя | RR 58 |
| objective, public, secret | цель, общая цель, секретная цель | RR 30 |
| score / scored / unscored | выполнить / выполненная / невыполненная | RR 30.5-30.18 |
| fulfill its requirements | удовлетворять её условиям | RR 30.4 |
| victory point, VP | победное очко, ПО | RR 51 |
| trade goods | товары | RR 78; CLAUDE.md |
| commodity / commodities | жетон продукции / продукция | RR 60; CLAUDE.md |
| commodity value | значение продукции | RR 60.3 |
| replenish commodities | пополнить продукцию | RR 60.3 |
| convert commodities to trade goods | конвертировать продукцию в товары | RR 60.5 |
| influence / resources (траты) | влияние / ресурсы («3 влияния», «4 ресурса», без «очков») | RR 9, 67; счёт как в TE |
| resource value / influence value | значение ресурсов / значение влияния | RR 49.1 |
| cost / combined cost | цена / общая цена | RR 87; TE |
| capacity / capacity value | места на борту / значение мест на борту | RR 38; CLAUDE.md / Vale |
| does not count against capacity | не занимает места на борту | RR 38 |
| move value | значение полёта | RR 55; CLAUDE.md / Vale |
| combat value | значение боя | RR 7.1 |
| Cost, Combat, Move, Capacity (строка характеристик) | Цена, Бой, Полёт, Места на борту | RR 7, 38, 55, 87; TE |
| combat / space combat / ground combat | бой / космический бой / наземный бой | RR 35, 41 |
| combat round | раунд боя | RR 35 |
| win a combat | победить в бою | RR 35.10 |
| opponent | противник | RR 63 |
| participate | участвовать | RR 63.1 |
| combat roll | боевая проверка | RR 35.5 |
| roll for a unit ability | бросить кубики при проверке способности юнита | RR 8.1, 19.1; TE |
| roll a die / die roll / result | бросить кубик / бросок кубика / результат | RR 12.2 |
| reroll | перебросить | RR 44 |
| hit / produce / assign / cancel | попадание / нанести / присвоить / отменить | RR 7.1, 35.6, 24.8 |
| destroy | уничтожить | RR 81 |
| damaged / repair | повреждённый / отремонтировать | RR 52, 84.7 |
| retreat / announce a retreat | отступить / объявить об отступлении | RR 35.4 |
| SUSTAIN DAMAGE | «Поглощение урона» | RR 52 |
| BOMBARDMENT | «Бомбардировка» | RR 8 |
| ANTI-FIGHTER BARRAGE | «Заградительный огонь» | RR 19 |
| SPACE CANNON | «Космическая пушка» | RR 34 |
| PLANETARY SHIELD | «Планетарный щит» | RR 48 |
| PRODUCTION / PRODUCTION value | «Производство» / значение производства | RR 61 |
| PRODUCTION limit | предел способности «Производство» | мой (в RR 61.1 описательно) |
| produce | произвести | RR 62 |
| blockaded | в блокаде | RR 6 |
| transport | перевозить | RR 46 |
| move / movement | передвинуть, передвигаться / передвижение | RR 47 |
| place (unit, token) | поместить | TE (в RR «разместить», «положить») |
| place this card faceup / near the game board | положить эту карту | RR 26.3; TE |
| commit ground forces | высадить наземные войска | RR 11.2 |
| invasion | вторжение | RR 11 |
| anomaly, asteroid field, nebula, gravity rift, supernova | аномалия, поле астероидов, туманность, гравитационный разлом, сверхновая | RR 3, 54, 80, 12, 68 |
| roll for gravity rifts | бросать кубики из-за гравитационных разломов | RR 12.2 |
| wormhole; alpha, beta, delta | червоточина; альфа-, бета-, дельта-червоточина | RR 88 |
| gamma wormhole | гамма-червоточина | мой, по образцу RR 88 |
| adjacent / in or adjacent to | смежный / в системе … или в смежной с ней | RR 70 |
| active system / activate | активная система / активировать | RR 1 |
| home system / non-home system | домашняя система / не домашняя система | CLAUDE.md, ru.json; TE (в RR «родная») |
| non-home planet | планета не в домашней системе | TE |
| planet you control | планета под вашим контролем | TE |
| gain / lose control | получить / потерять контроль | RR 32 |
| planet card | карта планеты | RR 49.5 |
| planet trait: cultural, hazardous, industrial | тип планеты: культурная, опасная, промышленная | RR 49 (в ru.json «черта») |
| technology specialty | технологическая специализация | RR 28.13 |
| technology / research / own | технология / исследовать / владеть | RR 28 |
| prerequisite | требование | RR 28.8 |
| unit upgrade technology | технология улучшения | RR 28.6, 29; TE |
| faction / non-faction technology | фракционная / не фракционная технология | RR 28.16; TE |
| technology deck | колода технологий | RR 28.4 |
| X or Y (assimilator) token | жетон (ассимиляции) X или Y | RR 28.18 |
| strategy card | карта стратегии | RR 27 |
| primary / secondary ability | основная / второстепенная способность | RR 10; CLAUDE.md / Vale |
| tactical / strategic / component action | тактическое / стратегическое / компонентное действие | RR 77, 75, 31 |
| perform an action / resolve an ability | совершить действие / применить способность | RR 82.1, 74 |
| redistribute command tokens | перераспределить жетоны приказов | RR 10.4 |
| strategy / action / status / agenda phase | фаза стратегии / действий / статуса / политики | RR 85, 82, 84, 83 |
| game round / turn | раунд игры / ход | RR 22 |
| pass | спасовать | ru.json; TE (в RR 82.2 «пропустить ход») |
| neighbor | сосед | RR 73 |
| transaction | сделка | RR 69 |
| setup | подготовка к игре | RR, «Подготовка» |
| attach / attachment | прикрепить / прикрепление | RR 59 |
| leader, agent, commander, hero | лидер, агент, командир, герой | ru.json; в RR нет |
| unlocked (commander) | открыт | ru.json; в RR нет |
| relic | реликвия | ru.json; в RR нет |
| relic fragment (cultural, hazardous, industrial) | фрагмент реликвии (культурный, опасный, промышленный) | нет в справочнике, перевод мой; TE |
| legendary planet | легендарная планета | ru.json; в RR нет |
| explore (planet, frontier token) | исследовать | ru.json «Карта исследования»; в RR нет |
| exploration deck | колода исследования | ru.json; в RR нет |
| frontier token | жетон рубежа | нет в справочнике, перевод мой; TE |
| DEPLOY | РАЗВЁРТЫВАНИЕ | нет в справочнике, перевод мой; TE |
| capture / captured unit | захватить / захваченный юнит | нет в справочнике, перевод мой |
| sleeper token | жетон спящего | нет в справочнике, перевод мой; TE |
| dimensional tear (token) | пространственный разрыв (жетон) | нет в справочнике, перевод мой |
| ion storm token | жетон ионного шторма | нет в справочнике, перевод мой |
| destroyed planet token | жетон уничтоженной планеты | нет в справочнике, перевод мой |
| swap the positions | поменять местами | нет в справочнике, перевод мой; TE |
| treat all laws as blank | считать, что у всех законов нет текста | нет в справочнике, перевод мой |
| eligible outcomes | допустимые варианты решения | нет в справочнике, перевод мой |
| force (a player to give) | заставить | нет в справочнике, перевод мой |
| The Fracture | Излом | ru.json, CLAUDE.md |

## Шаги и подшаги

| Английский | Русский | Откуда |
| --- | --- | --- |
| "Movement" step | шаг «Передвижение» | RR 77.2 |
| "Move Ships" substep | подшаг «Передвижение кораблей» | RR 47, шаг 1 |
| "Space Combat" / "Ground Combat" steps | шаги «Космический бой» / «Наземный бой» | RR 77.3, 11.4 |
| anti-fighter barrage step | шаг «Заградительный огонь» | RR 35.3 |
| "Roll Dice" step | шаг «Боевые проверки» | RR 35.5 (в русском справочнике шаг называется так) |
| "Retreat" substep | подшаг «Отступление» | RR 35.7 |
| "Commit Ground Forces" step | шаг «Высадка наземных войск» | RR 11.2 |

## Окна способностей и повторяющиеся шаблоны

| Английский | Русский | Откуда |
| --- | --- | --- |
| ACTION: | ДЕЙСТВИЕ: | RR 24.6, 31.1 |
| DEPLOY: | РАЗВЁРТЫВАНИЕ: | мой; TE |
| For: / Against: | За: / Против: | RR 26 |
| Attach: | Прикрепление: | RR 59 |
| When … / After … / Before … | Когда … / После того как … / Перед тем как … | RR 74; TE |
| At the start of … / At the end of … | В начале … / В конце … | RR 35.2 |
| During … / While … | Во время … / Пока … | RR |
| At any time: | В любой момент: | RR 28.4 |
| Then, / instead / otherwise / if able | Затем / вместо этого / в противном случае / если возможно | RR; TE |
| if you do | если вы это делаете | TE |
| as if it were | как если бы | TE |
| You may exhaust this card to … | Вы можете истощить эту карту, чтобы … | TE |
| You may exhaust this card at the end of your turn to … | Вы можете истощить эту карту в конце своего хода, чтобы … | TE |
| Then, purge this card. | Затем уберите эту карту из игры. | TE |
| Have 3 scored objectives. | У вас 3 выполненные цели. | TE |
| Have N X … (условие) | У вас N X … / У вас есть X … | TE |
| Control … / Own … / Be neighbors … (условие) | Контролируйте … / Владейте … / Будьте соседом … | TE («Владейте 8 технологиями») |
| Spend / Win / Destroy / Purge … (условие) | Потратьте / Победите / Уничтожьте / Уберите из игры … | RR 30.10 |
| a system that contains X | система, в которой есть X | RR 70 |
| 1 or more of your X | 1 или более ваших X | TE |
| up to N | до N | TE |
| use ABILITY | использовать «Способность» (с падежом: «Бомбардировку») | TE |
| the ABILITY ability / that have ABILITY | способность «…» / со способностью «…» | RR 8, 61 |
| gain ABILITY N | получить «Способность N» | TE |
| apply +N to the result of each … combat roll | добавьте +N к результату каждой боевой проверки | RR 80.3; TE |
| apply +1 to the move value of | добавьте +1 к значению полёта | RR 12.1 |
| apply -1 to the result of each die roll | примените -1 к результату каждого броска кубика | TE |
| rolls 1 additional die | бросает 1 дополнительный кубик | RR 7.2 |
| reduce the combined cost of the produced units by N | уменьшите общую цену произведённых юнитов на N | TE |
| its resource and influence values are each increased by N | её значения ресурсов и влияния увеличиваются на N каждое | RR 49 |
| This planet's resource value is increased by N | Значение ресурсов этой планеты увеличивается на N | RR 49 |
| Spend 1 token from your strategy pool to … | Потратьте 1 жетон приказа из своего стратегического резерва, чтобы … | Vale; TE |
| without spending a command token | не тратя жетон приказа | TE |
| place N X from your reinforcements on a planet you control | поместите N X из своего снабжения на планету под вашим контролем | TE |
| give you 1 promissory note from their hand | отдать вам 1 обязательство со своей руки | RR 25.5 |
| Predict aloud an outcome of this agenda. | Вслух предскажите вариант решения по этой карте политики. | RR 83.22 |
| You cannot vote on this agenda. | Вы не можете голосовать по этой карте политики. | RR 83.16 |
| draw 1 secret objective | возьмите 1 секретную цель | TE |
| return this card to the X player | верните эту карту игроку X | TE |
| the X player / the `<color>` player | игрок X / игрок `<color>` | TE |
| non-structure units | юниты, не являющиеся сооружениями | мой |
| ACTION: Purge 3 of your … relic fragments to gain 1 relic. | ДЕЙСТВИЕ: Уберите из игры 3 своих … фрагмента реликвий, чтобы получить 1 реликвию. | мой |
| If you have at least 1 mech on this planet, or if you remove 1 infantry from this planet, … | Если у вас есть хотя бы 1 мех на этой планете или если вы уберёте 1 пехоту с этой планеты, … | мой |

Регистр первой буквы после двоеточия повторяет исходный текст («When …: You may …» — «Когда …: Вы можете …»; «…: for each hit» — «…: за каждое попадание»).

## Что оставлено по-английски

Названия по правилу проекта не переводятся: фракции (Empyrean, Nomad, Keleres, Mentak, Xxcha, The Argent Flight, Argent, Naaz-Rokha, Mahact, Vuil'raith, Muaat), планеты и системы (Mecatol Rex, Mirage, Elysium, Custodia Vigilia, Creuss, Ahk Creuxx, Wormhole Nexus, Tomb of Emphidia), карты (Alliance, Crown of Emphidia, Valefar Assimilator, карта стратегии Imperial), фракционные способности (AWAKEN, Mitosis, Pillage, Fragile, Star Forge, Orbital Drop, Indoctrination, Stall Tactics). Плейсхолдер `<color>` не тронут.
