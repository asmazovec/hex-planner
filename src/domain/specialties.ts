import { componentById } from './components';
import type { DataPack, TechType } from './types';

/** The technology specialties of a planet: its printed ones and those the cards attached to it give (an exploration research facility). */
export const specialtiesOf = (pack: DataPack, planetId: string, attached: readonly string[] = []): TechType[] => [
  ...(pack.planets[planetId]?.tech ?? []),
  ...attached.flatMap(card => {
    const given = componentById(pack, card)?.detail?.techSpecialty;
    return typeof given === 'string' ? [given as TechType] : [];
  }),
];
