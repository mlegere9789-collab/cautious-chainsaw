// Dirty-tracked sprite lookup: a unit's sprite is re-resolved only when one of its visual inputs changes (tier, strength bucket, posture, facing bucket),
// so a steady frame does integer compares and no string building, no allocation.
import { TIERS, PAD, tierOf, drawTile, drawGlow, drawRing, spriteWH, drawChevron } from './lib.js';
export class TileSprites {
  constructor(atlas, tl, { text = true, bakedChev = true } = {}) {
    this.atlas = atlas; this.tl = tl; this.text = text; this.bakedChev = bakedChev; const n = tl.n;
    this.tier = new Int8Array(n).fill(-1); this.fb = new Int8Array(n); this.po = new Int8Array(n); this.cb = new Int8Array(n); this.ent = new Array(n).fill(null);
    this.glow = []; this.ring = []; this.chev = null; this.misses = 0;
    const k = atlas.k;
    for (let s = 0; s < 2; s++) { this.glow[s] = []; for (let t = 0; t < 3; t++) { const { w, h } = spriteWH(t); this.glow[s][t] = atlas.add(`g${s}${t}`, w, h, (g) => drawGlow(g, k, s, t)); } }
    for (let t = 0; t < 3; t++) { const { w, h } = spriteWH(t); this.ring[t] = atlas.add(`r${t}`, w, h, (g) => drawRing(g, t)); }
    this.chevE = [0, 1].map((s) => atlas.add(`c${s}`, 16, 16, (g) => drawChevron(g, 8, 8, 0, 0, 0, s ? '#f0a39a' : '#8fb4f0')));
  }
  resolve(i) {
    const tl = this.tl, s = tl.s[i], tier = tierOf(s), fb = Math.min(20, Math.round(s / tl.maxS[i] * 20)), po = tl.d[i], cb = this.bakedChev ? Math.round(tl.b[i] / 22.5) & 15 : 0;
    if (this.ent[i] && tier === this.tier[i] && fb === this.fb[i] && po === this.po[i] && cb === this.cb[i]) return this.ent[i];
    this.tier[i] = tier; this.fb[i] = fb; this.po[i] = po; this.cb[i] = cb; this.misses++;
    const side = tl.side[i], type = tl.type[i], text = this.text ? tl.units[i].name : null, { w, h } = spriteWH(tier), k = this.atlas.k;
    const key = `${side}|${type}|${tier}|${text}|${fb}|${po}|${this.bakedChev ? cb : 'x'}`;
    return (this.ent[i] = this.atlas.add(key, w, h, (g) => drawTile(g, k, { side, type, tier, text, frac: fb / 20, posture: po, chev: this.bakedChev ? cb * 22.5 : null })));
  }
}
export const bodyAnchor = (tier) => ({ ax: PAD + TIERS[tier].w / 2, ay: PAD + TIERS[tier].h / 2 });
