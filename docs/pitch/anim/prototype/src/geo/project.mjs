// geo/project.mjs - Web-Mercator projection with Mapbox's 512 px world tile, and a small camera.  Pure functions; the same numbers Mapbox GL uses, so
// the Studio's pixels are the site's pixels (03-data-fuel.md checked the model against Mapbox to 0.000 px in real Chrome).
export const WORLD0 = 512;
const D2R = Math.PI / 180;

/** [x, y] world pixels at zoom z (origin top-left of the world) */
export function project(lng, lat, z) {
  const s = WORLD0 * 2 ** z; const sin = Math.sin(lat * D2R);
  return [(lng + 180) / 360 * s, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s];
}
export function unproject(x, y, z) {
  const s = WORLD0 * 2 ** z; const lng = x / s * 360 - 180; const n = Math.PI - 2 * Math.PI * y / s;
  return [lng, Math.atan(Math.sinh(n)) / D2R];
}
/** ground metres per CSS pixel at latitude lat, zoom z */
export const metresPerPx = (lat, z) => 40075016.686 * Math.cos(lat * D2R) / (WORLD0 * 2 ** z);
/** metres per degree of latitude / longitude at lat (local flat-earth, used for distances well under 10 km) */
export const M_PER_DEG_LAT = 111195;
export const mPerDegLng = (lat) => 111195 * Math.cos(lat * D2R);
export const distM = (a, b) => Math.hypot((a.lat - b.lat) * M_PER_DEG_LAT, (a.lng - b.lng) * mPerDegLng(a.lat));

/** Camera: centre (lng, lat), fractional zoom, viewport in CSS px. */
export class Camera {
  constructor(o = {}) { this.lng = o.lng ?? -77.2377; this.lat = o.lat ?? 39.8206; this.zoom = o.zoom ?? 14; this.w = o.w ?? 1280; this.h = o.h ?? 800; }
  set(o) { Object.assign(this, o); return this; }
  /** world origin (at the current zoom) of the screen's top-left corner */
  origin() { const c = project(this.lng, this.lat, this.zoom); return [c[0] - this.w / 2, c[1] - this.h / 2]; }
  toScreen(lng, lat) { const p = project(lng, lat, this.zoom); const c = project(this.lng, this.lat, this.zoom); return [p[0] - c[0] + this.w / 2, p[1] - c[1] + this.h / 2]; }
  fromScreen(x, y) { const c = project(this.lng, this.lat, this.zoom); return unproject(c[0] + x - this.w / 2, c[1] + y - this.h / 2, this.zoom); }
  mpp() { return metresPerPx(this.lat, this.zoom); }
}
