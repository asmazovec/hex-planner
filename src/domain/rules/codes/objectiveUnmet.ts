import { defineCode } from '../codeDef';

/**
 * An objective scored without its requirement met (LRR 61.5, 61.5.1, 81.1: it must be fulfilled in the Score Objectives
 * step; 61.10: a cost must be paid at the time the card says). Made by the status phase from the `requirement` of the
 * objective's effect, or by its `play`; params `objective` (component id), `have` and `need`.
 */
export default defineCode('objectiveUnmet', {
  rules: ['61.5', '61.5.1', '61.10', '81.1'],
  step: 'status',
  text: {
    ru: 'Цель {{objective}} выполнена без её условия: есть {{have}}, нужно {{need}}.',
    en: 'Objective {{objective}} is scored without its requirement: {{have}} of {{need}}.',
  },
});
