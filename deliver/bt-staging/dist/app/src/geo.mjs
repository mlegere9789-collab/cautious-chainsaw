// Geographic helpers. The prototype terrain maps lng/lat to metres (x east, z south) with a Web-Mercator window; this file adds the inverse.
const TILE = 512, Z15 = 2 ** 15 * TILE;
export function makeGeo(T) {
  const [bx, by, bw, bh] = T.meta.z15box, mpp = T.meta.groundMPerZ15Px;
  const xz = (lng, lat) => T.xz(lng, lat);
  const lnglat = (x, z) => {
    const px = x / mpp + bx + bw / 2, py = z / mpp + by + bh / 2;
    const lng = px / Z15 * 360 - 180, n = Math.PI - 2 * Math.PI * py / Z15;
    return [lng, 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))];
  };
  const inside = (x, z, pad = 40) => Math.abs(x) < T.W / 2 - pad && Math.abs(z) < T.H / 2 - pad;
  return { xz, lnglat, inside };
}
export const bearingDeg = (dx, dz) => (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360;   // 0 = north, clockwise; x east, z south
export const angleLerp = (a, b, t) => { let d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * t; };
