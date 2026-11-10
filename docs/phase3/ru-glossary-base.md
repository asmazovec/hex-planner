# Глоссарий перевода текстов базовой игры (`src/data/texts/base.ru.json`)

Источники:

- **RR** — русский справочник правил Hobby World 2021 (`TI07_Rules_Reference_RU_2021_web-min.pdf` в корпусе knowledge-rag), номер — параграф справочника.
- **CLAUDE.md / Vale** — раздел «Данные и язык» и `.vale/styles/TI4Ru/Terms.yml`.
- **ru.json** — слова русского интерфейса проекта (`src/i18n/ru.json`).
- **te** — решение, согласованное с переводом Thunder's Edge (`docs/phase3/ru-glossary-te.md`), чтобы файлы не расходились.
- **мой** — нет в справочнике, перевод мой.

Там, где проект и справочник расходятся, взят термин проекта; термин справочника записан в столбце «Откуда». 18 текстов, английский оригинал которых дословно совпадает с текстом из `te.json` (карты стратегии Leadership, Politics, Trade, Technology, Imperial и технологии `aida`, `amd`, `det`, `nm`, `pa`, `ps`, `sdn`, `st`), взяты из `te.ru.json` без изменений.

## Термины

| Английский | Русский | Откуда |
| --- | --- | --- |
| command token | жетон приказа | RR 18; CLAUDE.md / Vale |
| tactic pool / fleet pool / strategy pool | тактический резерв / резерв флота / стратегический резерв | RR 50, 66; CLAUDE.md / Vale |
| token from your strategy pool | жетон приказа из своего стратегического резерва | Vale; te |
| command sheet | планшет приказов | RR 50 |
| reinforcements | снабжение | RR 71; Vale |
| supply (trade goods) | общий запас | RR, подготовка, шаг 9; RR 60.4 |
| unit | юнит | CLAUDE.md, ru.json; te (в RR 43 «отряд») |
| ship | корабль | RR 33 |
| ground forces | наземные войска; один — «юнит наземных войск» | RR 40; CLAUDE.md / Vale; te |
| infantry | пехота («1 пехоту», «2 пехоты», «до 3 пехот») | RR 17, 43.2; счёт как в te |
| fighter, destroyer, cruiser, dreadnought, flagship | истребитель, эсминец, крейсер, дредноут, флагман | RR 33, 43.2 |
| carrier | транспортник | RR 33, 43.2 (в текстах base только в названиях) |
| war sun | солнце войны | RR 28.20, 33 |
| PDS | ПСО | RR 64; ru.json |
| space dock | база | RR 5; CLAUDE.md / Vale |
| structure | сооружение | RR 72 |
| space area | космос (системы) | RR 11.2, 33.1 |
| game board | игровое поле | RR 21 |
| tile | тайл | ru.json; te (в RR 86 «фрагмент поля») |
| play area / common play area | игровая зона / общая игровая зона | RR 26.4, подготовка |
| faceup | лицевой стороной вверх | RR 53.1 |
| exhaust / exhausted | истощить / истощённый | ru.json; te (в RR 45 «перевернуть», «перевёрнутая карта») |
| ready | подготовить | RR 53, 84.6; ru.json |
| discard | сбросить | RR 24.4, 26.5 |
| draw (a card) | взять (карту) | RR 24.3 |
| hand | рука | RR 24.3, 24.4 |
| deck / top, bottom of the deck | колода / верх, низ колоды | RR 56, 58.2 |
| reveal | раскрыть | RR 83.2 |
| action card | карта действия | RR 24 |
| play (an action card) | сыграть (карту действия) | RR 24.7 |
| cancel | отменить | RR 24.8, 52.1 |
| promissory note | обязательство | ru.json; te (в RR 25 «карта обещания»); в текстах base слово не встречается, карта называет себя «эта карта» |
| agenda / agenda deck / agenda phase | карта политики / колода политики / фаза политики | RR 26, 83 |
| law | закон | RR 26.2 |
| vote / cast votes | голосовать / отдать голоса | RR 83.5, 83.9 |
| outcome | решение (вариант решения) | RR 83.2, 83.17 |
| For / Against | За / Против | RR 26.3, 26.6 |
| elected player / planet | выбранный игрок / выбранная планета | RR 83.10, 83.11 |
| predict (aloud) / prediction | предсказать (вслух) / предсказание | RR 83.22 |
| attach | прикрепить | RR 59 |
| owner / own | владелец / владеть | RR 26.4, 28.1 |
| speaker / speaker token | председатель / жетон председателя | RR 58 |
| objective, public, secret | цель, общая цель, секретная цель | RR 30 |
| stage I / stage II public objective | общая цель этапа I / этапа II | RR, подготовка, шаг 12 |
| score (an objective) | выполнить (цель) | RR 30.5 |
| fulfill its requirements | удовлетворять её условиям | RR 30.4, 30.5 |
| victory point | победное очко | RR 51 |
| trade goods | товары | RR 78; CLAUDE.md |
| commodities | продукция | RR 60; CLAUDE.md; te |
| replenish commodities | пополнить продукцию | RR 60.3 |
| influence / resources | влияние / ресурсы («потратьте 8 ресурсов», «16 влияния») | RR 9, 67; счёт без «очков» как в te (в RR «очки влияния», «очки ресурсов») |
| influence value / resource value | значение влияния / значение ресурсов | RR 49.1, 49.2 |
| spend | потратить | RR 9.2 |
| cost / combined cost | цена / общая цена | RR 62.1 |
| capacity | места на борту | RR 38; CLAUDE.md / Vale |
| move value | значение полёта | RR 47.2; CLAUDE.md / Vale |
| combat value | значение боя | RR 7.1 |
| Cost, Combat, Move, Capacity (строка характеристик) | Цена, Бой, Полёт, Места на борту | RR 7, 38, 39, 62; te |
| combat / space combat / ground combat | бой / космический бой / наземный бой | RR 35, 41 |
| combat round, round of combat | раунд боя | RR 19, 35 |
| combat roll / make a combat roll | боевая проверка / провести боевую проверку | RR 7.1, 35.5 |
| BOMBARDMENT roll | проверка «Бомбардировки» | RR 8.1 |
| roll a die / die roll / result | бросить кубик / бросок кубика / результат | RR 34.3, 35.5 |
| reroll | перебросить | RR 44 |
| modifier | модификатор | RR 39 |
| hit / produce a hit / assign a hit | попадание / нанести попадание / присвоить попадание | RR 7.1, 35.6 |
| destroy | уничтожить | RR 81 |
| repair / damaged | отремонтировать / повреждённый | RR 52, 84.7 |
| retreat | отступить | RR 35.4, 35.7 |
| the combat ends in a draw | бой завершается вничью | RR 35.10, 41.4 |
| win a combat | победить в бою | RR 35.10 |
| opponent | противник | RR 63 |
| participate | участвовать | RR 63.1 |
| SUSTAIN DAMAGE | «Поглощение урона» | RR 52 |
| BOMBARDMENT | «Бомбардировка» | RR 8 |
| ANTI-FIGHTER BARRAGE | «Заградительный огонь» | RR 19 |
| SPACE CANNON | «Космическая пушка» | RR 34 |
| PLANETARY SHIELD | «Планетарный щит» | RR 48 |
| PRODUCTION / PRODUCTION value | «Производство» / значение производства | RR 61, 61.1 |
| produce | произвести | RR 62 |
| transported | перевозка («передвигаться без перевозки») | RR 46 |
| blockaded | в блокаде | RR 6 |
| move / movement | передвинуть, передвигаться / передвижение | RR 47 |
| invasion | вторжение | RR 11 |
| commit units (to land) / land | высадить юниты / высаживать | RR 11.2; te |
| bombardment step | шаг «Бомбардировка» | RR 8, 11.1 |
| space cannon offense step | шаг «Космическая пушка: атака» | RR 34.2 |
| anomaly: asteroid field, nebula, supernova | аномалия: поле астероидов, туманность, сверхновая | RR 3, 54, 80, 68 |
| wormhole; alpha, beta, delta | червоточина; альфа-, бета-, дельта-червоточина | RR 88.1, 88.4 |
| wormhole token | жетон червоточины | RR 65.10 |
| adjacent | смежный | RR 70 |
| active system / active player / activate | активная система / активный игрок / активировать | RR 1, 2 |
| home system / non-home | домашняя система / не домашняя | CLAUDE.md, ru.json; te (в RR «родная система») |
| control / gain control / lose control | контролировать / получить контроль / потерять контроль | RR 32 |
| planet you control | планета под вашим контролем | te (в RR «подконтрольная ему планета») |
| planet trait: cultural, hazardous, industrial | тип планеты: культурная, опасная, промышленная | RR 49.3 |
| technology specialty | технологическая специализация | RR 28.13 |
| custodians token | жетон хранителей | RR 16 |
| strategy card | карта стратегии | RR 27 |
| primary / secondary ability | основная / второстепенная способность | RR 10; CLAUDE.md / Vale |
| tactical / strategic action | тактическое / стратегическое действие | RR 77, 75 |
| perform (an action) | совершить (действие) | RR 82 |
| resolve (an ability) | применить (способность) | RR 75.1 |
| redistribute command tokens | перераспределить жетоны приказов | RR 10.4 |
| strategy / action / status phase | фаза стратегии / фаза действий / фаза статуса | RR 85, 82, 84 |
| turn / game round | ход / игровой раунд | RR 22, 82 |
| initiative order | порядок инициативы | RR 57 |
| pass / passed | спасовать / спасовавший | ru.json; te (в RR 82.2 «пропустить ход») |
| neighbor | сосед | RR 73 |
| transaction / negotiate a transaction | сделка / заключить сделку | RR 69, 73.1 |
| technology / research | технология / исследовать | RR 28.9 |
| prerequisite; green, yellow, blue, red | требование; зелёное, жёлтое, синее, красное | RR 28.7, 28.8 |
| unit upgrade technology | технология улучшения | RR 28.6, 29 |
| faction technology / faction ability | фракционная технология / фракционная способность | RR 28.16, 74.25 |
| game effect | игровой эффект | RR 8.1 |
| assimilator token | жетон ассимиляции | RR 28.18 |
| eliminated | разгромлен | RR 65 |
| frontier token | жетон рубежа | te (нет в справочнике: Prophecy of Kings) |
| explore | исследовать | ru.json; te (нет в справочнике: Prophecy of Kings) |
| place (a unit, a token) | поместить (куда) | RR 18.4 для жетонов; для юнитов как в te (в RR 76.2 «разместить») |
| remove (a token, units) | убрать | RR 10.3, 16.2 |
| Naalu "0" token | жетон Naalu «0» | RR 57.1 (в RR «жетон „0“ Клубка Наалу») |

## Окна способностей и повторяющиеся шаблоны

| Английский | Русский | Откуда |
| --- | --- | --- |
| ACTION: | ДЕЙСТВИЕ: | RR 24.6, 74.5 (слово «Действие») |
| When … | Когда … | RR, формулировки п. 28.14, 60.3 |
| After … | После того как … | RR 18.5, 29.4 |
| Before … | Перед тем как … | RR 35.6 |
| At the start of … / At the end of … | В начале … / В конце … | RR 82.3 («в начале вашего хода») |
| Once per combat / agenda phase | Один раз за бой / за фазу политики | мой |
| Then, | Затем | RR 10.3 |
| otherwise | в противном случае | te |
| if able | если возможно | мой |
| if you do | если вы это делаете | te |
| as if | как если бы | te |
| instead | вместо этого; «вместо 1», «вместо прежней» | мой |
| Exhaust this card to … | Истощите эту карту, чтобы … | te |
| You may exhaust this card … | Вы можете истощить эту карту … | te |
| Then, return this card to the X player. | Затем верните эту карту игроку X. | te (шаблон «игрок X») |
| the `<color>` player | игрок `<color>` | te; плейсхолдер оставлен как есть |
| Place this card faceup in your play area. | Положите эту карту лицевой стороной вверх в свою игровую зону. | te |
| While this card is in your play area | Пока эта карта находится в вашей игровой зоне | te |
| Apply +1 to the result of each of your unit's combat rolls | Добавьте +1 к результату каждой боевой проверки ваших юнитов | RR 39.1, 80.3; te |
| Apply -1 to the result of … | Примените -1 к результату … | te |
| Apply +1 to the move value of | Добавьте +1 к значению полёта | RR 12.1 |
| a system that contains X | система, в которой есть X | RR 70.1 |
| that contains 1 or more of your ships | в которой есть 1 или более ваших кораблей | RR 70.1 |
| that does not contain another player's ships | в которой нет кораблей другого игрока | RR 6 |
| non-fighter ships | корабли, кроме истребителей | te |
| non-home system / non-home planet | не домашняя система / планета не в домашней системе | te |
| Spend 1 token from your strategy pool to … | Потратьте 1 жетон приказа из своего стратегического резерва, чтобы … | RR 18.5; Vale; te |
| from your reinforcements | из своего снабжения | RR 71; te |
| return it to their reinforcements | верните его в снабжение этого игрока | RR 71 |
| You cannot vote on this agenda. | Вы не можете голосовать по этой карте политики. | RR 83.14 |
| Predict aloud an outcome of this agenda. If your prediction is correct, … | Предскажите вслух решение по этой карте политики. Если ваше предсказание верно, … | RR 83.22 |
| The elected player gains this card. | Выбранный игрок получает эту карту. | RR 83.10 |
| Attach this card to the elected planet's card. | Прикрепите эту карту к карте выбранной планеты. | RR 59 |
| Players vote on this agenda instead. | Игроки голосуют по этой карте политики вместо прежней. | мой |
| For: … / Against: … / No effect. | За: … / Против: … / Нет эффекта. | RR 26.3, 26.6 |
| Each player that voted "For" | Каждый игрок, голосовавший «За» | RR 26.3 |
| Game effects cannot prevent you from using this ability. | Игровые эффекты не могут помешать вам использовать эту способность. | мой |
| This unit cannot be destroyed by "Direct Hit" action cards. | Этот юнит не может быть уничтожен картами действий «Direct Hit». | название карты по правилу проекта |
| This unit may move without being transported. | Этот юнит может передвигаться без перевозки. | RR 46 |
| Fighters in excess of your ships' capacity count against your fleet pool. | Истребители сверх количества мест на борту ваших кораблей учитываются в вашем резерве флота. | RR 33.2, 38 |
| Control N planets … / Own N … / Have N … / Spend N … (цели) | Контролируйте … / Владейте … / Имейте … / Потратьте … | RR 30 (условия целей); повелительное наклонение моё |
| SUSTAIN DAMAGE, BOMBARDMENT 3(x3) (строка способностей) | «Поглощение урона», «Бомбардировка 3 (x3)» | te: способность в кавычках, число внутри |

## Что оставлено по-английски

Названия по правилу проекта не переводятся: фракции (Winnu, Nekro, L1Z1X, Hacan, Xxcha, Muaat, Naalu, Yin, Creuss, Sol, Mentak, Jol-Nar, Saar, Yssaril, Arborec, N'orr, Letnev), планеты и тайлы (Mecatol Rex, Creuss Gate), карты стратегии («Technology», «Trade», «Diplomacy»), карта действия «Direct Hit», технология «Valefar Assimilator», фракционные способности, названные в тексте (Technological Singularity, Pillage, Telepathic). Плейсхолдер `<color>` и записи вида `5 (x3)`, `1(x2)`, «X», «Y», α, β оставлены как в источнике.
