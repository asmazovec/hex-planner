import { useTranslation } from 'react-i18next';
import type { TokenKind } from '../../../domain/hexLayout';
import { SectionTitle } from '../../primitives/SectionTitle';
import { UnitShop, type ShopItem } from './UnitShop';

export interface SetupPanelProps {
  items: ShopItem[];
  onPick: (kind: TokenKind) => void;
  /** Only structures are offered. */
  structuresOnly: boolean;
  manyPlanets: boolean;
}

/** Setup: a picture places one on the hex, a token takes one off. */
export function SetupPanel({ items, onPick, structuresOnly, manyPlanets }: SetupPanelProps) {
  const { t } = useTranslation();
  return (
    <>
      <SectionTitle>{t(structuresOnly ? 'stage.structures' : 'stage.place')}</SectionTitle>
      <UnitShop items={items} onPick={onPick} />
      <p className="muted">{t('stage.setupNote')}</p>
      {manyPlanets && <p className="muted">{t('stage.planetNote')}</p>}
    </>
  );
}
