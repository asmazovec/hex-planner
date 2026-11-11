import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { loadPack } from '../../data/loadPack';
import type { DataPack, ExpansionId } from '../../domain/types';

/**
 * The data of the expansions with the texts of components in the language of the interface: the same pack between
 * renders, a new one when the expansions or the language change, so that everything kept per pack is built again.
 * No expansions yet (no open game) is the base game.
 */
export function usePack(expansions: ExpansionId[] | undefined): DataPack {
  const { i18n } = useTranslation();
  const language = i18n.language === 'en' ? 'en' : 'ru';
  return useMemo(() => loadPack(expansions ?? [], language), [expansions, language]);
}
