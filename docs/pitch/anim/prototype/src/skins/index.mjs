// skins/index.mjs - THE list of skins the Studio registers at start-up.  A design pitch adds its skin here (one import, one array entry) and runs `node build.mjs`.
// The registry itself ships empty (kernel/registry.mjs); this list is the shell's choice.  The reference skin is an engine test skin, not a design.
import { referenceSkin } from './reference.mjs';

export const SKINS = [referenceSkin];
