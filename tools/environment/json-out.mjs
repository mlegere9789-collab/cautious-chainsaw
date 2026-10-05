// Deterministic pretty JSON: 2-space indentation, but arrays of primitives stay on one line (so a 675-row table is 675 lines, not 6,000).
export function pretty(value, indent = '') {
  const next = indent + '  ';
  const prim = (v) => v === null || ['number', 'string', 'boolean'].includes(typeof v);
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    if (value.every(prim)) return '[' + value.map((v) => JSON.stringify(v)).join(', ') + ']';
    return '[\n' + value.map((v) => next + pretty(v, next)).join(',\n') + '\n' + indent + ']';
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).filter((k) => value[k] !== undefined);
    if (!keys.length) return '{}';
    return '{\n' + keys.map((k) => `${next}${JSON.stringify(k)}: ${pretty(value[k], next)}`).join(',\n') + '\n' + indent + '}';
  }
  return JSON.stringify(value);
}
