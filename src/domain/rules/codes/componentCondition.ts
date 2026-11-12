import { defineCode } from '../codeDef';

/**
 * A component whose printed condition does not hold when it is played. Made by its play; params `id`, `name` and
 * `condition` (a short phrase).
 */
export default defineCode('componentCondition', {
  rules: ['53.3', '22.1'],
  step: 'component',
  text: {
    ru: 'Условие компонента {{name}} не выполнено: {{condition}}.',
    en: 'The condition of {{name}} is not met: {{condition}}.',
  },
});
