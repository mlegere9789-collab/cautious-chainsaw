// skins/index.mjs - THE list of skins the Studio registers at start-up (d3 fork).  The Precision Field Manual is a family (d3, d3/day, d3/cvd, d3/contrast) built from the token file
// tokens/d3.skin.tokens.json, which build.mjs inlines and app.mjs hands to makeSkins().  The reference skin stays as the engine's own test skin.  To add a skin: import it here, add one array entry.
import { referenceSkin } from './reference.mjs';
import { makeD3Skins } from './d3.mjs';

/** @param {object} d3json  the parsed tokens/d3.skin.tokens.json */
export function makeSkins(d3json) { return [referenceSkin, ...makeD3Skins(d3json)]; }
