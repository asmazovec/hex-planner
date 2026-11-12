import { defineCode } from '../codeDef';

/** An objective the player has already scored: each is scored once a game (LRR 61.8). */
export default defineCode('objectiveRepeated', {
  rules: ['61.8', '81.1'],
  step: 'status',
  text: {
    ru: 'Цель {{objective}} уже выполнена этим игроком: каждая цель выполняется один раз за партию.',
    en: 'Objective {{objective}} is already scored by this player: each objective is scored once a game.',
  },
});
