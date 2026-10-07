// skins/index.mjs - THE list of skins this fork registers.  D4 FORK: the three pitched families of the first prototype are not registered here (their fonts and footprints belong to the old measuring table);
// Dispatch (art direction 4, editorial annotation) comes as two families, `dispatch-paper` (dark ink on the survey-print ground) and `dispatch-aerial` (white ink on the dark aerial), each with a
// colour-blind-safe and a high-contrast variant.  The reference skin stays as the engine's own test skin.
import { referenceSkin } from './reference.mjs';
import { DISPATCH } from './editorial.mjs';

export const SKINS = [...DISPATCH, referenceSkin];
