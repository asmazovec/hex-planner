import { defineCode } from '../codeDef';

/**
 * LRR 2.6.1: a player cannot resolve a component action they cannot resolve completely. Made by the play of a
 * component whose effect has no valid target; params `id`, `name` and `reason` (a short phrase).
 */
export default defineCode('componentUnresolved', {
  rules: ['2.6.1'],
  step: 'component',
  text: {
    ru: '{{name}} нельзя выполнить полностью: {{reason}}.',
    en: '{{name}} cannot be resolved completely: {{reason}}.',
  },
});
