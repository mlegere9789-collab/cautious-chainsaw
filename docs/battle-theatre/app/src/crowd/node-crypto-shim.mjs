// The figure generators import node:crypto for the hash helpers that only the build tools call. The page maps that specifier here (import map in index.html); the helpers are never used in the page.
export default { createHash() { throw new Error('node:crypto is not available in the page: the hash helpers are for the build tools'); } };
