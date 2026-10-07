import { luminance, contrast, simulate, CVD_TYPES, deltaE } from '../src/colour.mjs';
const U = ['#1A4B8F', '#1F5AA6', '#2A5FA8', '#204A85'];
const C = ['#C94A1E', '#D4501E', '#BC3F22', '#B53A1C', '#C2461F'];
const X = ['#D9A21B', '#E6B800', '#F0C94A', '#7A838E'];
const f = (v) => v.toFixed(2);
console.log('glyph white contrast:');
for (const c of [...U, ...C, ...X]) console.log(c, f(contrast('#ffffff', c)), 'L', luminance(c).toFixed(3), ' dark #101820:', f(contrast('#101820', c)));
console.log('\nUnion vs Confederate: dE2000 per vision (normal/pro/deut/trit), luminance ratio');
for (const u of U) for (const c of C) {
  const row = CVD_TYPES.filter((t) => t !== 'achromatopsia').map((t) => deltaE(simulate(u, t), simulate(c, t)).toFixed(1));
  console.log(u, c, row.join(' / '), ' lumRatio', f(contrast(u, c)));
}
console.log('\nContested vs both');
for (const x of X) for (const [n, s] of [['U', U[0]], ['C', C[0]]]) {
  const row = CVD_TYPES.filter((t) => t !== 'achromatopsia').map((t) => deltaE(simulate(x, t), simulate(s, t)).toFixed(1));
  console.log(x, n, row.join(' / '), 'lumRatio', f(contrast(x, s)));
}
