import { defineCode } from '../codeDef';

/**
 * Ghost Ship names a system outside its words: "a non-home system that contains a wormhole and does not contain
 * other players' ships". Made by the play of actionCard:ghost_ship; params `systemId` (the slot) and `reason`
 * (`none`, `wormhole`, `home` or `ships`).
 */
export default defineCode('ghostShipSystem', {
  rules: ['2.6'],
  step: 'component',
  text: {
    ru: 'Ghost Ship ставит эсминец только в систему без домашних планет, где есть червоточина и нет чужих кораблей: {{systemId}} не подходит.',
    en: 'Ghost Ship places a destroyer only in a non-home system that contains a wormhole and no other players\' ships: {{systemId}} does not qualify.',
  },
});
