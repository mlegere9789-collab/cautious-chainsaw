// skins/index.mjs - THE list of skins the Studio registers at start-up.  The engine's own test skin (reference) stays so the engine has something to draw before a style is chosen; the design is
// Strategy Premium (premium.mjs), with its colour-blind-safe and high-contrast variants registered as premium/cvd and premium/contrast.  To add a skin: one import and one array entry here.
import { referenceSkin } from './reference.mjs';
import { PREMIUM } from './premium.mjs';

export const SKINS = [referenceSkin, ...PREMIUM];
