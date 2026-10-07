// geo.mjs - Web Mercator on the 512-px world the Battle Studio camera uses (Mapbox GL's convention), plus the unit-square form the vector data is stored in.
// Pure functions, no state, no DOM.  Named exports only (the Studio's bundler forbids default exports).
export const WORLD0 = 512;                       // px of the whole world at zoom 0 (tile size = 512 too, so tile zoom z == camera zoom z)
export const TILE = 512;
const D2R = Math.PI / 180;

/** world pixels at zoom z (origin top-left of the world); identical to geo/project.mjs project() of the prototype */
export function project(lng, lat, z) {
  const s = WORLD0 * 2 ** z; const sin = Math.sin(lat * D2R);
  return [(lng + 180) / 360 * s, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s];
}
export function unproject(x, y, z) {
  const s = WORLD0 * 2 ** z; const n = Math.PI - 2 * Math.PI * y / s;
  return [x / s * 360 - 180, Math.atan(Math.sinh(n)) / D2R];
}
/** unit-square mercator coordinates in [0,1): the form the vectors are stored in (multiply by 512*2^z for pixels at zoom z) */
export function unitX(lng) { return (lng + 180) / 360; }
export function unitY(lat) { const sin = Math.sin(lat * D2R); return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI); }
/** ground metres per CSS pixel at latitude lat, zoom z */
export function metresPerPx(lat, z) { return 40075016.686 * Math.cos(lat * D2R) / (WORLD0 * 2 ** z); }

/** The camera of the Studio: { lng, lat, zoom, w, h } (CSS px).  Anything with these five fields works. */
export function viewOf(camera) {
  const z = camera.zoom; const c = project(camera.lng, camera.lat, z);
  return { z, w: camera.w, h: camera.h, ox: c[0] - camera.w / 2, oy: c[1] - camera.h / 2 };   // ox, oy: world px (at zoom z) of the top-left screen corner
}
export function toScreen(view, lng, lat) { const p = project(lng, lat, view.z); return [p[0] - view.ox, p[1] - view.oy]; }
