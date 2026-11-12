import { test } from 'vitest';

// "Place 1 destroyer from your reinforcements in a non-home system that contains a wormhole and does not contain
//  other players' ships."
// The player chooses the system in the editor of the component action; the editor has no choices yet
// (`Entry.choices` is written by no block, and a system would be picked on the map), and the harness
// (src/ui/testing/effects.tsx) has no view of it.
test.todo('actionCard:ghost_ship the system is chosen on the map for the component action and a destroyer appears there: no editor of a component\'s choices yet');
