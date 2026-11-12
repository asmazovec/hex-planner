import { defineCode } from '../codeDef';

/**
 * An action card played by a player a law forbids to play them (Political Censure: "The elected player cannot play
 * action cards"). Made by the `restrict` hook of the law's effect for a component action, a card spent or one named in
 * `uses` (`actionCardsPlayed`); `id` and `name` are the card. LRR 2.6 and 2.7 say what playing a card is.
 */
export default defineCode('actionCardBarred', {
  rules: ['2.6', '2.7', 'agenda:censure'],
  step: 'component',
  text: {
    ru: 'Закон запрещает этому игроку играть карты действий: {{name}}.',
    en: 'A law forbids this player to play action cards: {{name}}.',
  },
});
