import { test } from 'vitest';

// "Choose 1 planet. Destroy each PDS on that planet."
// The player chooses the planet in the editor of the component action; the editor has no choices yet
// (`Entry.choices` is written by no block), and the harness (src/ui/testing/effects.tsx) has no view of it.
test.todo('actionCard:cripple the planet is chosen in the component action and its PDS leave the map: no editor of a component\'s choices yet');
