/**
 * G'hom Sek'kus (Sardakk N'orr, commander): "During the "Commit Ground Forces" step: You can commit (move) up to 1
 * ground force from each planet in the active system and each planet in adjacent systems that do not contain 1 of
 * your command tokens."
 *
 * Decided: a passive waiver of a new check. LRR 49.2 commits only the ground forces in the space area of the active
 * system; a landing whose ground force comes from a planet (`from`, a new field of a landing) is warned of for everyone
 * (`landingFromPlanet`, 49.2, step invasion), and the unlocked commander lifts it for at most one ground force from
 * each planet of the active system or of an adjacent system without one of the player's command tokens. No ship is
 * needed in the active system (tirules2, Sardakk N'orr, G'hom Sek'kus 2).
 *
 * Pass 1: a hint, as the guide asks; the waiver is written in pass 2.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:sardakkcommander';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
