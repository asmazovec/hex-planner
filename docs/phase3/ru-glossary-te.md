# Глоссарий перевода текстов Thunder's Edge (`src/data/texts/te.ru.json`)

Источники:

- **RR** — русский справочник правил Hobby World 2021 (`TI07_Rules_Reference_RU_2021_web-min.pdf` в корпусе knowledge-rag), номер — параграф справочника. В нём только базовая игра: Prophecy of Kings и Thunder's Edge он не описывает.
- **CLAUDE.md / Vale** — раздел «Данные и язык» и `.vale/styles/TI4Ru/Terms.yml`.
- **ru.json** — слова русского интерфейса проекта (`src/i18n/ru.json`).
- **мой** — нет ни в справочнике, ни в проекте, перевод мой.

Там, где проект и справочник расходятся, взят термин проекта; расхождение записано в столбце «Откуда».

## Термины

| Английский | Русский | Откуда |
| --- | --- | --- |
| command token | жетон приказа | RR 18; CLAUDE.md / Vale |
| tactic pool / fleet pool / strategy pool | тактический резерв / резерв флота / стратегический резерв | RR 50, 66; CLAUDE.md / Vale |
| token from your strategy pool | жетон приказа из своего стратегического резерва | Vale |
| reinforcements | снабжение | RR 71; Vale |
| supply (trade goods from the supply) | общий запас | RR, подготовка, шаг 9 |
| unit | юнит | CLAUDE.md, ru.json (в RR 43 «отряд») |
| ship / ground forces | корабль / наземные войска (один: юнит наземных войск) | RR 33, 40; CLAUDE.md / Vale |
| structure | сооружение | RR 72; ru.json |
| carrier, cruiser, destroyer, dreadnought, fighter, war sun, flagship | транспортник, крейсер, эсминец, дредноут, истребитель, солнце войны, флагман | RR 33, 43.2 |
| infantry | пехота | RR 17, 43.2 |
| mech | мех | ru.json (в RR нет) |
| PDS | ПСО | RR 64; ru.json |
| space dock | база | RR 5; CLAUDE.md / Vale |
| space area | космос (системы) | RR 11.2, 33.1 |
| exhaust / exhausted | истощить / истощён | ru.json (в RR 45 «перевернуть», «перевёрнутая карта»; не взято ещё и потому, что в TE есть отдельное flip) |
| ready / readied | подготовить / подготовленный | RR 53; ru.json |
| flip | перевернуть | мой (обычное слово) |
| purge | убрать из игры | ru.json «убран»; RR 16 «убирается из игры» |
| remove (token, unit) | убрать | RR 16.2, 38.3 |
| discard / discard pile | сбросить / стопка сброса | RR 24.7, 26.5 |
| draw | взять (карту) | RR 24.3 |
| hand | рука | RR 24.3, 25.6 |
| deck / top, bottom of the deck | колода / на верх, под низ колоды | RR 56 |
| faceup / facedown | лицевой стороной вверх / взакрытую | RR 30.18, 25.6 |
| play area | игровая зона | RR 26.4 («общая игровая зона») |
| game board | игровое поле | RR 21 |
| game effect | игровой эффект | RR 8.1, 52.3 |
| faction sheet | планшет фракции | RR, подготовка |
| faction ability / unit ability | фракционная способность / способность юнита | RR 74.25, 74.26 |
| action card | карта действия | RR 24 |
| promissory note | обязательство | ru.json (в RR 25 «карта обещания») |
| agenda / agenda deck | карта политики / колода политики | RR 26; ru.json |
| vote | голосовать, голос | RR 83.5 |
| speaker / speaker token | председатель / жетон председателя | RR 58 (в ru.json дважды «спикер») |
| objective, public, secret | цель, общая цель, секретная цель | RR 30; ru.json |
| score (an objective) / scored / unscored | выполнить / выполненная / невыполненная | RR 30.5-30.18 |
| fulfill its requirements | удовлетворять её условиям | RR 30.4 «условия» |
| victory point | победное очко | RR 51 |
| trade goods | товары | RR 78; CLAUDE.md |
| commodities | продукция | RR 60; CLAUDE.md |
| replenish commodities | пополнить продукцию | RR 60.3 |
| convert a commodity to a trade good | конвертировать продукцию в товар | RR 60.5 |
| influence / resources | влияние / ресурсы | RR 9, 67 |
| influence value / resource value | значение влияния / значение ресурсов | RR 49.1, 49.2 |
| spend | потратить | RR 9.2 |
| cost | цена | RR 62.1, 74.10 |
| capacity | места на борту | RR 38; CLAUDE.md / Vale |
| move value | значение полёта | RR 47.2; CLAUDE.md / Vale |
| combat value | значение боя | RR 7.1 |
| Cost, Combat, Move, Capacity (строка характеристик) | Цена, Бой, Полёт, Места на борту | RR 7, 38, 47, 62 |
| combat / space combat / ground combat | бой / космический бой / наземный бой | RR 35, 41 |
| combat round, round of combat | раунд боя | RR 35 |
| combat roll | боевая проверка | RR 35.5 |
| roll (for a unit ability), BOMBARDMENT roll | проверка способности юнита, проверка «Бомбардировки» | RR 8.1, 19.1, 34.3 |
| roll dice / die roll / result | бросить кубики / бросок кубика / результат | RR 35.5 |
| reroll | перебросить | RR 44 |
| hit / produce hits / assign hits | попадание / нанести попадания / присвоить попадания | RR 7.1, 35.6 |
| cancel | отменить | RR 24.8, 52.1 |
| destroy | уничтожить | RR 81 |
| repair / damaged | отремонтировать / повреждённый | RR 52, 84.7 |
| retreat / declare a retreat | отступить / объявить об отступлении | RR 35.4, 35.7 |
| opponent | противник | RR 63 |
| SUSTAIN DAMAGE | «Поглощение урона» | RR 52 |
| BOMBARDMENT | «Бомбардировка» | RR 8 |
| ANTI-FIGHTER BARRAGE | «Заградительный огонь» | RR 19 |
| SPACE CANNON | «Космическая пушка» | RR 34 |
| PRODUCTION | «Производство» | RR 61 |
| produce | произвести | RR 62 |
| transport | перевозить | RR 46 |
| move (ships) / movement | передвинуть, передвигаться / передвижение | RR 47 |
| commit ground forces; «Commit Ground Forces» step | высадить наземные войска; шаг «Высадка наземных войск» | RR 11.2 |
| anomaly: asteroid field, gravity rift | аномалия: поле астероидов, гравитационный разлом | RR 3, 54, 12 |
| wormhole | червоточина | RR 88 |
| epsilon wormhole | червоточина эпсилон | мой |
| adjacent | смежный | RR 70 |
| border (between systems) | граница | мой |
| active system / activate | активная система / активировать | RR 1 |
| home system / non-home | домашняя система / не домашняя | CLAUDE.md, ru.json (в RR «родная система») |
| tile | тайл | ru.json |
| control / gain control / control token (marker) | контроль / получить контроль / жетон контроля | RR 32 |
| planet you control | планета под вашим контролем | RR 61 |
| planet card | карта планеты | RR 49.5 |
| strategy card | карта стратегии | RR 27 |
| primary / secondary ability | основная / второстепенная способность | RR 10; CLAUDE.md / Vale |
| tactical / strategic action | тактическое / стратегическое действие | RR 77, 75 |
| perform (an action) | совершить действие | RR 82.1 |
| resolve (an ability) | применить способность | RR 74 |
| redistribute command tokens | перераспределить жетоны приказов | RR 10.4, 84.5 |
| action / status phase | фаза действий / фаза статуса | RR 82, 84 |
| turn / round | ход / раунд | RR 22 |
| pass / passed | спасовать / спасовавший | ru.json (в RR 82.2 «пропустить ход») |
| neighbor | сосед | RR 73 |
| transaction | сделка | RR 69; ru.json |
| agree / agreement | договориться / договорённость | RR 14 |
| technology / research | технология / исследовать | RR 28.9 |
| prerequisite | требование | RR 28.8; ru.json |
| unit upgrade technology | технология улучшения | RR 28.6, 29 |
| faction technology / non-faction | фракционная технология / не фракционная | RR 28.16 |
| technology specialty | технологическая специализация | RR 28.13 |
| own (a technology) | владеть | RR 28.1 |
| attachment | прикрепление | RR 59 |
| assimilator token | жетон ассимиляции | RR 28.18-28.20 |
| setup | подготовка к игре | RR, «Подготовка» |
| leader, agent, commander, hero | лидер, агент, командир, герой | ru.json |
| unlock (ключ `#unlock`) | условие открытия, без заголовка | ru.json «Открытие» |
| relic / relic fragment | реликвия / фрагмент реликвии | ru.json / мой |
| legendary planet | легендарная планета | ru.json |
| explore (planet, frontier token) | исследовать | ru.json «Карта исследования» |
| frontier token | жетон рубежа | мой |
| DEPLOY | РАЗВЁРТЫВАНИЕ | мой |
| sleeper token | жетон спящего | мой |
| breakthrough | прорыв | ru.json, CLAUDE.md |
| The Fracture | Излом | ru.json, CLAUDE.md |
| ingress token | жетон входа | ru.json |
| breach, active / inactive; breach token | брешь, активная / неактивная; жетон бреши | мой |
| galvanize / galvanized / galvanize token | гальванизировать / гальванизированный / жетон гальванизации | мой |
| coexist / into coexistence | сосуществовать / в сосуществование | мой |
| ocean card | карта океана | мой |
| plot / plot card | заговор / карта заговора | мой |
| puppeted player | игрок-марионетка | мой |
| neutral (unit) | нейтральный | мой |
| SYNERGY | «Синергия» | мой |
| text abilities | текстовые способности | мой |
| trigger (a structure) | задействовать | мой |
| swap the position | поменять местами | мой |

## Окна способностей и повторяющиеся шаблоны

| Английский | Русский | Откуда |
| --- | --- | --- |
| ACTION: | ДЕЙСТВИЕ: | RR 24.6, 74.5 (слово «Действие») |
| DEPLOY: | РАЗВЁРТЫВАНИЕ: | мой |
| When … | Когда … | RR 74.15 |
| After … | После того как … | RR 74.14 |
| Before … | Перед тем как … | RR 74.14 |
| At the start of … / At the end of … | В начале … / В конце … | RR 35 («в начале боя», «в конце раунда боя») |
| At any time: | В любой момент: | RR 28.4 |
| Then, | Затем | RR 74.17 |
| otherwise | в противном случае | мой |
| if you do | если вы это делаете | мой |
| as if | как если бы | мой |
| Exhaust this card to … | Истощите эту карту, чтобы … | ru.json |
| You may exhaust this card to … | Вы можете истощить эту карту, чтобы … | ru.json |
| … purge this card | … уберите эту карту из игры | ru.json; RR 16 |
| When you gain this card | Когда вы получаете эту карту | RR 28.5 |
| Flip this card if … | Переверните эту карту, если … | мой |
| apply +1 to the move value of | добавьте +1 к значению полёта | RR 12.1 |
| apply +1 to the result of each … combat roll | добавьте +1 к результату каждой боевой проверки | RR 80.3 |
| a system that contains X | система, в которой есть X | RR 70.1 |
| that does not contain your command tokens | в которой нет ваших жетонов приказов | RR 47 |
| a planet you control | планета под вашим контролем | RR 61 |
| non-fighter ships | корабли, кроме истребителей | мой |
| non-home system / non-home planet | не домашняя система / планета не в домашней системе | мой |
| non-faction, non-unit upgrade technology | технология, не являющаяся ни фракционной, ни технологией улучшения | RR 28 |
| up to N | до N | RR |
| up to 2 systems away | на расстоянии до 2 систем | мой |
| does not count against | не учитывается в (ограничении) / не занимает (места на борту) | RR 38 |
| Spend 1 token from your strategy pool to … | Потратьте 1 жетон приказа из своего стратегического резерва, чтобы … | RR 18.5; Vale |
| without spending a command token | не тратя жетон приказа | RR 18 |
| Have 3 scored objectives. | У вас 3 выполненные цели. | RR 30 |
| This technology cannot be researched. | Эту технологию нельзя исследовать. | RR 74.6 |
| the X player (The Obsidian player) | игрок X (игрок The Obsidian) | мой |

## Что оставлено по-английски

Названия по правилу проекта не переводятся: фракции (The Firmament, The Obsidian, Embers of Muaat, Nekro Virus, Ral Nel, Last Bastion, Deepwrought, Rebellion), планеты и тайлы (Mecatol Rex, Avernus, Cronos Hollow, Tallin Hollow, Custodia Vigilia, Sorrow), карты и технологии (Sabotage, Support for the Throne, Alliance, Cruiser II, The Silver Flame, карта стратегии Technology), юниты с собственным именем (Corsair, Eidolon Maximum, Linkship), фракционные способности (STALL TACTICS, SCHEMING, COALESCENCE, STAR FORGE), жетоны с именем (Void Tether, Sever).
