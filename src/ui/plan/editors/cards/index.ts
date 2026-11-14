/** The blocks of each strategy card in the editor, by initiative, following the card handlers of the domain. */
import { CARD } from '../../../../domain/strategy';
import { constructionBlocks } from './construction';
import { diplomacyBlocks } from './diplomacy';
import { imperialBlocks } from './imperial';
import type { CardBlocks } from './kit';
import { leadershipBlocks } from './leadership';
import { politicsBlocks } from './politics';
import { technologyBlocks } from './technology';
import { tradeBlocks } from './trade';
import { warfareBlocks } from './warfare';

export { playersBeside } from './kit';
export type { CardBlocks, CardKit } from './kit';

export const CARD_BLOCKS: Record<number, CardBlocks> = {
  [CARD.leadership]: leadershipBlocks,
  [CARD.diplomacy]: diplomacyBlocks,
  [CARD.politics]: politicsBlocks,
  [CARD.construction]: constructionBlocks,
  [CARD.trade]: tradeBlocks,
  [CARD.warfare]: warfareBlocks,
  [CARD.technology]: technologyBlocks,
  [CARD.imperial]: imperialBlocks,
};
