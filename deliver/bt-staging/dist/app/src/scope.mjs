// A Scope owns everything a page session starts: listeners, timers, animation frames, observers and cleanup callbacks. dispose() leaves nothing behind.
export class Scope {
  constructor(name = 'scope') {
    this.name = name; this.ac = new AbortController(); this.timers = new Map(); this.rafs = new Map(); this.observers = []; this.cleanups = []; this.disposed = false; this.nListeners = 0; this._id = 0;
  }
  get signal() { return this.ac.signal; }
  on(target, type, fn, opts = {}) { if (this.disposed) return; this.nListeners++; target.addEventListener(type, fn, { ...(typeof opts === 'boolean' ? { capture: opts } : opts), signal: this.ac.signal }); }
  timeout(fn, ms) { if (this.disposed) return 0; const id = setTimeout(() => { this.timers.delete(id); fn(); }, ms); this.timers.set(id, 'timeout'); return id; }
  interval(fn, ms) { if (this.disposed) return 0; const id = setInterval(fn, ms); this.timers.set(id, 'interval'); return id; }
  clear(id) { if (this.timers.has(id)) { clearTimeout(id); clearInterval(id); this.timers.delete(id); } }
  raf(fn) { if (this.disposed) return 0; const id = requestAnimationFrame(t => { this.rafs.delete(id); fn(t); }); this.rafs.set(id, 1); return id; }
  cancelRaf(id) { if (this.rafs.has(id)) { cancelAnimationFrame(id); this.rafs.delete(id); } }
  observe(o) { this.observers.push(o); return o; }
  add(fn) { this.cleanups.push(fn); }
  counts() { return { listeners: this.nListeners, timers: this.timers.size, rafs: this.rafs.size, observers: this.observers.length }; }
  dispose() {
    if (this.disposed) return; this.disposed = true; this.ac.abort();
    for (const [id] of this.timers) { clearTimeout(id); clearInterval(id); } this.timers.clear();
    for (const [id] of this.rafs) cancelAnimationFrame(id); this.rafs.clear();
    for (const o of this.observers) { try { o.disconnect(); } catch { /* already gone */ } } this.observers.length = 0;
    for (const fn of this.cleanups.reverse()) { try { fn(); } catch (e) { console.warn('cleanup failed', e); } } this.cleanups.length = 0;
  }
}
export class Bus {                 // small event emitter whose subscriptions belong to a Scope
  constructor() { this.m = new Map(); }
  on(name, fn, scope) { let s = this.m.get(name); if (!s) this.m.set(name, s = new Set()); s.add(fn); if (scope) scope.add(() => s.delete(fn)); return () => s.delete(fn); }
  emit(name, a, b) { const s = this.m.get(name); if (s) for (const fn of [...s]) fn(a, b); }
  clear() { this.m.clear(); }
}
