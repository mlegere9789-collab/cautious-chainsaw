// host/skins.mjs - THE LIST OF SKINS the engine registers at start-up.  To add a look: write one module in src/engine/skins/ that exports a defineSkin(...) result (see skins/minimal.mjs: 35 lines),
// add one import and one entry here, run `node tools/t0/anim/build-anim.mjs`.  Nothing else changes: the tuning panel lists it, ?anim=skin:<id> selects it, the legend is generated from it.
import { STANDARDS } from '../engine/skins/standards.mjs';
import { MINIMAL } from '../engine/skins/minimal.mjs';

/** the first entry is the default look (the approved one, "Standards") */
export const SKINS = [...STANDARDS, MINIMAL];
