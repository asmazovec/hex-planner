/**
 * What the landing block offers beyond the space area of the active system, declared by the components in force
 * (docs/phase4/infra/fields.md). Added by declaration merging so that no shared interface is edited.
 */
import type { DataPack, StructureKind } from '../../types';
import { effectOf, inForceOf, type Holder } from '../registry';

/** What a component lets the landing offer. Nothing is forbidden either way: the replay warns, the offer only shows. */
export interface LandingOffer {
  /** Structures placed on a planet straight from the reinforcements (Reclamation, Reclaimer): landing tiles that no flight has to bring. */
  structures?: StructureKind[];
  /** Ground forces committed from planets instead of the space area (G'hom Sek'kus): offered per planet of the active and the adjacent systems. */
  fromPlanets?: boolean;
  /** Ships built may be placed in another system (The Icon): the production block offers the systems with my command token. */
  shipsAway?: boolean;
}

declare module '../types' {
  interface ComponentEffect {
    /** A passive effect in force widens what the landing block offers. */
    landingOffer?: LandingOffer;
  }
}

/** The offers of every component in force for `holder`, together. */
export function landingOffers(pack: DataPack, holder: Holder): { structures: StructureKind[]; fromPlanets: boolean; shipsAway: boolean } {
  const structures = new Set<StructureKind>();
  let fromPlanets = false;
  let shipsAway = false;
  for (const id of inForceOf(pack, holder, effect => effect.landingOffer !== undefined)) {
    const offer = effectOf(pack, id)?.landingOffer;
    for (const kind of offer?.structures ?? []) structures.add(kind);
    if (offer?.fromPlanets) fromPlanets = true;
    if (offer?.shipsAway) shipsAway = true;
  }
  return { structures: [...structures], fromPlanets, shipsAway };
}
