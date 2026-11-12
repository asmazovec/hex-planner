import { test } from 'vitest';

// "Place 3 infantry from your reinforcements on 1 planet you control."
// The player chooses the planet in the editor of the component action; the editor has no choices yet
// (`Entry.choices` is written by no block), and the harness (src/ui/testing/effects.tsx) has no view of it.
test.todo('actionCard:f_deployment the planet is chosen in the component action and 3 infantry appear on it: no editor of a component\'s choices yet');
