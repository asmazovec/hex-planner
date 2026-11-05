type Lang = 'ru' | 'en';
type Summary = Record<Lang, string>;

const NO_SHIELD: Summary = {
  ru: 'В этой системе чужие юниты теряют Планетарный щит.',
  en: 'Enemy units here have no Planetary Shield.',
};
const NO_DIRECT_HIT: Summary = {
  ru: 'Карта действия Direct Hit не может его уничтожить.',
  en: 'Immune to Direct Hit action cards.',
};
const NEAR_MECHS: Summary = {
  ru: 'Можно считать его соседним с системами, где есть хотя бы 1 ваш мех.',
  en: 'Counts as adjacent to any system holding at least 1 of your mechs.',
};

// Own short retellings for the player's memory, not card text. Shown only: nothing here is ever calculated.
export const SHIP_SUMMARIES: Record<string, Summary> = {
  dreadnought2: NO_DIRECT_HIT,
  fighter2: {
    ru: 'Летает без транспортировки. Истребители сверх вместимости ваших кораблей занимают места в пуле флота.',
    en: 'Flies on its own. Fighters beyond what your ships can carry take up fleet pool.',
  },
  warsun: NO_SHIELD,
  arborec_flagship: {
    ru: 'После активации вами этой системы можете построить в ней до 5 юнитов.',
    en: 'On activating this system yourself, build up to 5 units here if you wish.',
  },
  argent_destroyer2: {
    ru: 'При заградительном огне каждый результат 9 или 10 ещё и уничтожает 1 пехоту соперника в космосе активной системы.',
    en: 'During its barrage, every 9 or 10 also kills 1 enemy infantry in the active system’s space.',
  },
  argent_flagship: {
    ru: 'Соперники не могут стрелять космическими пушками по вашим кораблям в этой системе.',
    en: 'No space cannon from other players may target your ships here.',
  },
  cabal_flagship: {
    ru: 'Захватывает все уничтоженные в этой системе юниты, кроме сооружений, в том числе ваши.',
    en: 'Captures every destroyed non-structure unit in this system, yours too.',
  },
  empyrean_flagship: {
    ru: 'Когда юнит любого игрока здесь или в соседней системе применит устойчивость, можете потратить 2 влияния и починить его.',
    en: 'When anyone’s unit here or next door uses Sustain Damage, pay 2 influence to repair it.',
  },
  ghost_flagship: {
    ru: 'В системе этого корабля есть дельта-червоточина. При перемещении он может лететь раньше или позже остальных ваших кораблей.',
    en: 'Its system holds a delta wormhole. In movement, it may go ahead of or behind your other ships.',
  },
  hacan_flagship: {
    ru: 'После вашего броска кубика в космическом бою в этой системе можете потратить 1 товар и добавить +1 к результату.',
    en: 'Each time you roll a die in a space combat here, 1 trade good buys +1 on it.',
  },
  jolnar_flagship: {
    ru: 'В броске боя этого корабля каждый результат 9 или 10 до модификаторов даёт ещё 2 попадания.',
    en: 'Its combat dice showing 9 or 10 before modifiers score 2 extra hits.',
  },
  l1z1x_dreadnought2: NO_DIRECT_HIT,
  l1z1x_flagship: {
    ru: 'В космическом бою попадания этого корабля и ваших дредноутов в этой системе по возможности назначаются на корабли, кроме истребителей.',
    en: 'In space combat, hits from it and your dreadnoughts here go to non-fighter ships when possible.',
  },
  letnev_flagship: {
    ru: 'В этой системе чужие юниты теряют Планетарный щит. В начале каждого раунда космического боя этот корабль чинится.',
    en: 'Enemy units here have no Planetary Shield. It repairs itself as each space combat round begins.',
  },
  mahact_flagship: {
    ru: 'В бою против соперника, чьего жетона нет в вашем пуле флота, +2 к броскам боя этого юнита.',
    en: '+2 to its combat rolls against an opponent with no command token in your fleet pool.',
  },
  mentak_flagship: {
    ru: 'Корабли других игроков в этой системе не могут применять устойчивость.',
    en: 'Enemy ships here cannot use Sustain Damage.',
  },
  muaat_flagship: {
    ru: 'Действие: потратьте 1 жетон из пула стратегии и поставьте 1 крейсер в эту систему.',
    en: 'Action: pay 1 strategy pool token to put 1 cruiser here.',
  },
  muaat_warsun: NO_SHIELD,
  muaat_warsun2: NO_SHIELD,
  naalu_fighter2: {
    ru: 'Летает без транспортировки. Каждый истребитель сверх вместимости ваших кораблей занимает половину места в пуле флота.',
    en: 'Flies on its own. Each fighter beyond what your ships can carry takes half a place in the fleet pool.',
  },
  naalu_flagship: {
    ru: 'При вторжении в этой системе можете отправить истребители на планеты как наземные войска. После боя они возвращаются в космос.',
    en: 'During an invasion here, fighters may land on planets as ground forces; they go back to space after combat.',
  },
  naaz_flagship: {
    ru: 'Ваши мехи в этой системе бросают в бою на 1 кубик больше.',
    en: 'Your mechs here roll 1 more combat die.',
  },
  nekro_flagship: {
    ru: 'В начале космического боя выберите сколько угодно своих наземных войск в этой системе: они сражаются как корабли.',
    en: 'As space combat starts, pick any of your ground forces here to fight as ships.',
  },
  nomad_flagship: NEAR_MECHS,
  nomad_flagship2: NEAR_MECHS,
  sardakk_dreadnought2: {
    ru: 'Карта действия Direct Hit не может его уничтожить. После раунда космического боя можете уничтожить его, чтобы уничтожить до 2 кораблей в системе.',
    en: 'Immune to Direct Hit cards. After a space combat round, you may sacrifice it to kill up to 2 ships here.',
  },
  sardakk_flagship: {
    ru: '+1 к броскам боя других ваших кораблей в этой системе.',
    en: '+1 to combat rolls of your other ships here.',
  },
  sol_flagship: {
    ru: 'В конце фазы статуса поставьте 1 пехоту из запаса в космос этой системы.',
    en: 'As the status phase ends, put 1 reinforcement infantry in this system’s space.',
  },
  titans_flagship: {
    ru: 'Развёртывание: после активации системы с вашей PDS можете заменить 1 такую PDS этим кораблём.',
    en: 'Deploy: after activating a system with your PDS, swap 1 of them for this unit.',
  },
  winnu_flagship: {
    ru: 'В броске боя кидает столько кубиков (попадание на 7), сколько в этой системе у соперника кораблей, кроме истребителей.',
    en: 'Rolls one die, hitting on 7, per non-fighter enemy ship in this system.',
  },
  xxcha_flagship: {
    ru: 'Его космическая пушка может стрелять и по кораблям в соседних системах.',
    en: 'Its Space Cannon also reaches ships in adjacent systems.',
  },
  yin_flagship: {
    ru: 'Когда этот корабль уничтожен, уничтожаются все корабли в этой системе.',
    en: 'If destroyed, it takes every ship in the system with it.',
  },
  yssaril_flagship: {
    ru: 'Может пролетать через системы с кораблями других игроков.',
    en: 'May fly through systems holding enemy ships.',
  },
  bastion_flagship: {
    ru: '+1 к каждому своему броску боя за каждую не домашнюю систему, где вы контролируете планету.',
    en: '+1 on each of its combat rolls per non-home system where you hold a planet.',
  },
  deepwrought_flagship: {
    ru: 'Может пролетать через системы с вашими юнитами, даже если там есть чужие; за каждую такую систему +1 к движению.',
    en: 'May pass through systems holding your units despite other players there; +1 move for each such system.',
  },
  crimson_flagship: {
    ru: 'Пока он в системе с активной брешью, юниты других игроков в системах с активными брешами теряют все способности юнитов.',
    en: 'While it sits beside an active breach, rival units in active-breach systems lose all unit abilities.',
  },
  crimson_destroyer: {
    ru: 'В конце боя любого игрока здесь или в соседней системе можете поставить туда 1 неактивную брешь.',
    en: 'When anyone’s combat ends here or next door, add 1 inactive breach there if you wish.',
  },
  crimson_destroyer2: {
    ru: 'В конце боя любого игрока здесь или не дальше 2 систем отсюда можете поставить туда 1 активную или неактивную брешь.',
    en: 'When anyone’s combat ends here or within 2 systems, add 1 breach there, active or not, if you wish.',
  },
  ralnel_flagship: {
    ru: 'При отступлении может уничтожить 1 корабль без устойчивости в активной системе.',
    en: 'On retreat, may kill 1 ship lacking Sustain Damage in the active system.',
  },
  ralnel_destroyer: {
    ru: 'Может применять космическую пушку вашего сооружения в своём космосе; каждое сооружение срабатывает один раз.',
    en: 'May fire Space Cannon from a structure you own in the same space, at most once per structure.',
  },
  ralnel_destroyer2: {
    ru: 'Может применять космическую пушку вашего сооружения в своём космосе; одно сооружение может служить каждому такому кораблю.',
    en: 'May fire Space Cannon from a structure you own in the same space; one structure may serve every Linkship.',
  },
  firmament_flagship: {
    ru: 'Если в активной системе есть юниты игрока с маркером контроля на вашем заговоре: +1 к движению, и корабль чинится в конце каждого раунда боя.',
    en: 'When the active system holds units of a player with a control marker on your plot: +1 move, and it repairs after each combat round.',
  },
  keleres_flagship: {
    ru: 'Чтобы активировать систему с этим кораблём, другие игроки тратят 2 влияния.',
    en: 'Other players pay 2 influence to activate its system.',
  },
};

export const shipSummary = (unitId: string, lang: Lang): string | null => SHIP_SUMMARIES[unitId]?.[lang] ?? null;
