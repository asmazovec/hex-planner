import { defineCode } from '../codeDef';

/** A system chosen for an effect that needs it free of other players' ships (the Helmsman). The component's own text is the rule. Made by its play. */
export default defineCode('systemOccupied', {
  rules: ['leader:l1z1xhero'],
  step: 'component',
  text: {
    ru: 'В выбранной системе уже стоят корабли других игроков.',
    en: 'Ships of other players already stand in the chosen system.',
  },
});
