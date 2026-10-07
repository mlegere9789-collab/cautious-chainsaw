// skins/index.mjs - THE list of skins the Studio registers at start-up.  FORK (d1 Quiet Cartographer): the Quiet Cartographer in its two grounds (night, day), each with a colour-blind-safe and a
// high-contrast variant, plus the engine's own REFERENCE skin (an engine test skin, not a design) and the 35-line `minimal` skin that shows how little a new skin needs.
import { referenceSkin } from './reference.mjs';
import { QUIET_NIGHT, QUIET_DAY } from './quiet-cartographer.mjs';
import { MINIMAL } from './minimal.mjs';

export const SKINS = [referenceSkin, ...QUIET_NIGHT, ...QUIET_DAY, MINIMAL];
