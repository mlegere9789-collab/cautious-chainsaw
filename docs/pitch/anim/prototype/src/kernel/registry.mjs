// kernel/registry.mjs - the one extension mechanism of the Battle Studio: NAMED registries of interchangeable modules.
//
//   const kernel = createKernel();               // one set of registries per engine (tests never leak into each other)
//   kernel.skins.register('my-skin', { ... });   // a design pitch registers a skin;   kernel.popups.register(...);  kernel.fx.register(...)
//
// A registry only stores definitions and checks that each carries the members its kind requires (a missing member fails loudly at registration,
// not in the middle of a frame).  Definitions are plain objects; nothing here knows what a skin or a layout strategy does.

import { validateSkin } from '../skins/contract.mjs';

const ID = /^[a-z][a-z0-9]*(?:[-/.][a-z0-9]+)*$/;

export class Registry {
  /** @param {string} kind  e.g. 'skins'   @param {{required?: string[], validate?: (id:string, def:object)=>void, defaults?: object}} [opts] */
  constructor(kind, opts = {}) {
    this.kind = kind; this.required = opts.required || []; this.validate = opts.validate || null; this._m = new Map(); this._subs = new Set();
  }
  /** register a definition under a unique id (kebab-case, optional "/" or "." namespaces).  Re-registering needs {replace: true}. */
  register(id, def, { replace = false } = {}) {
    if (typeof id !== 'string' || !ID.test(id)) throw new Error(`${this.kind}: bad module id ${JSON.stringify(id)} (lower-case words joined by - / .)`);
    if (!def || typeof def !== 'object') throw new Error(`${this.kind}/${id}: the definition must be an object`);
    if (this._m.has(id) && !replace) throw new Error(`${this.kind}/${id}: already registered (pass {replace: true} to replace it)`);
    for (const k of this.required) if (def[k] === undefined) throw new Error(`${this.kind}/${id}: missing required member "${k}"`);
    if (this.validate) this.validate(id, def);
    const entry = Object.freeze({ ...def, id, label: def.label || id });
    this._m.set(id, entry);
    for (const f of this._subs) f({ type: 'register', kind: this.kind, id });
    return entry;
  }
  unregister(id) { const had = this._m.delete(id); if (had) for (const f of this._subs) f({ type: 'unregister', kind: this.kind, id }); return had; }
  has(id) { return this._m.has(id); }
  /** the definition, or throws (use has() to probe) */
  get(id) { const d = this._m.get(id); if (!d) throw new Error(`${this.kind}: no module "${id}" (registered: ${this.ids().join(', ') || 'none'})`); return d; }
  ids() { return [...this._m.keys()]; }
  list() { return [...this._m.values()]; }
  get size() { return this._m.size; }
  /** subscribe to register / unregister events; returns the unsubscribe function */
  subscribe(fn) { this._subs.add(fn); return () => this._subs.delete(fn); }
}

/** the registries of one engine.  ONLY the engine's own built-ins are registered by builtins.mjs; skins, popups and fx start EMPTY. */
export function createKernel() {
  return {
    interp: new Registry('interp', { required: ['build'] }),         // motion models: build(keyframes, opts) -> path
    layout: new Registry('layout', { required: ['create'] }),        // layout strategies: create(ctx) -> { solve(input), reset() }
    motion: new Registry('motion', { required: ['create'] }),        // display dynamics: create(ctx) -> { step(layout, dt), reset() }
    skins: new Registry('skins', { required: ['draw'], validate: validateSkin }),           // how a tile looks (see skins/contract.mjs)
    popups: new Registry('popups', { required: ['update'] }),        // what pops up during the animation (see popups/host.mjs)
    fx: new Registry('fx', { required: ['update'] }),                // map effects drawn between the backdrop and the tiles
    backdrops: new Registry('backdrops', { required: ['draw'] }),    // schematic ground
  };
}
