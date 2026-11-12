import { defineCode } from '../codeDef';

/**
 * More secret objectives, scored and unscored, than the limit after an entry drew one. LRR 61.21: "at most three secret
 * objectives"; 45.4 (Imperial's secondary) returns the extra one. The limit is the `secretLimit` of the count. Params
 * `secrets` and `limit`.
 */
export default defineCode('secretsOverLimit', {
  rules: ['61.21', '61.21.1', '45.4'],
  step: 'component',
  text: {
    ru: 'Тайных целей {{secrets}} (выполненных и нет), а можно {{limit}}.',
    en: 'The player has {{secrets}} secret objectives, scored or not, and the limit is {{limit}}.',
  },
});
