import { defineCode } from '../codeDef';

/**
 * A promissory note given to a player whose own component forbids receiving it (Hubris: other players cannot give the
 * Mahact player their Alliance note). LRR 94.3: a transaction exchanges promissory notes; 69.5: a note changes hands
 * only as a transaction allows. Made by the `dealt` hook of the receiver's component; `id` is the note, `name` its name.
 */
export default defineCode('noteRefused', {
  rules: ['94.3', '69.5'],
  step: 'transaction',
  text: {
    ru: 'Игрок не может получить это обязательство: {{name}}.',
    en: 'The player cannot receive this promissory note: {{name}}.',
  },
});
