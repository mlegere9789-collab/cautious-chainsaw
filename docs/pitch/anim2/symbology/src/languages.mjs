// src/languages.mjs - the registry of frame languages.  Add a language = write src/lang-<id>.mjs with a default export { id, label, silhouette, base, glyph } and list it here.
import nato from './lang-nato.mjs';
import shield from './lang-shield.mjs';
import minimal from './lang-minimal.mjs';
export const LANGUAGES = { nato, shield, minimal };
export const LANGUAGE_IDS = Object.keys(LANGUAGES);
