// skins/index.mjs - THE list of skins the Studio registers at start-up.  A design pitch adds its skin here (one import, one array entry) and runs `node build.mjs`.
// The reference skin is an engine test skin, not a design.  The three pitched families come with a colour-blind-safe and a high-contrast variant each (registered as <id>/cvd and <id>/contrast);
// `minimal` is the 50-line skin that shows how little a new skin needs.
import { referenceSkin } from './reference.mjs';
import { FIELD_MANUAL } from './field-manual.mjs';
import { WAR_ROOM } from './war-room.mjs';
import { MAP_1863 } from './map-1863.mjs';
import { MINIMAL } from './minimal.mjs';

export const SKINS = [referenceSkin, ...FIELD_MANUAL, ...WAR_ROOM, ...MAP_1863, MINIMAL];
