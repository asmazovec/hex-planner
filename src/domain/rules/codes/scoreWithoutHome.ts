import { defineCode } from '../codeDef';

/**
 * A public objective scored while the player does not control every planet of their home system. LRR 61.16 and the
 * note of the status phase: "A player cannot score public objectives if that player does not control each planet in
 * their home system." Secret objectives are not covered. Made by the status phase; `objective` is the component id.
 */
export default defineCode('scoreWithoutHome', {
  rules: ['61.16', '81.1'],
  step: 'status',
  text: {
    ru: 'Публичную цель нельзя выполнить, не контролируя каждую планету своей домашней системы: {{objective}}.',
    en: 'A public objective cannot be scored without controlling every planet of the home system: {{objective}}.',
  },
});
