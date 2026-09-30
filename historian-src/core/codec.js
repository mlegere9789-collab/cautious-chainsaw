// codec.js - wire formats for the passage tier. Encoding is used by the build, decoding by the runtime; both live here so they cannot drift.
//   ix/NNN.json   {b, t: { term: [num0, q0, dnum1, q1, ...] }}      delta-coded doc numbers, q = impact8 (0..255)
//   en/NN.json    {b, e: { entityId: [num0, role0, dnum1, role1, ...] }}   role 2 = subject/author, 1 = mention
//   tx/NNNN.json  {h: [field names], p: [[...], ...]}               16 passages per shard, compact arrays

export const TX_FIELDS = ['num', 'id', 'doc', 'rec', 'kind', 'day', 'text', 'sb', 'cite', 'ents', 'clk', 'source', 'prior', 'sens'];
export const PER_SHARD = 16;

export function encodeDeltaPairs(pairs) {           // [[num, val], ...] ascending by num
  const out = []; let prev = 0;
  for (const [n, v] of pairs) { out.push(n - prev, v); prev = n; }
  return out;
}
export function decodeDeltaPairs(flat) {
  const out = []; let n = 0;
  for (let i = 0; i < flat.length; i += 2) { n += flat[i]; out.push([n, flat[i + 1]]); }
  return out;
}
export function encodePassage(p) {
  return [p.num, p.id, p.doc, p.rec, p.kind, p.day, p.text, p.sb, p.cite, p.ents, p.clk, p.source_id, p.prior, p.sens && p.sens.length ? p.sens : 0];
}
export function decodePassage(row, header = TX_FIELDS) {
  const o = {};
  header.forEach((k, i) => { o[k] = row[i]; });
  if (!o.sens) o.sens = [];
  return o;
}
export const shardOf = (num) => Math.floor(num / PER_SHARD);
