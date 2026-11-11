// The event bus (docs/battle-theatre/app/docs/BT-EVENTS.md). Synchronous, ordered, allocation-free on the emit path: the vector arguments and the `info` objects are REUSED between calls (copy what you keep).
// Handlers are isolated: a throwing handler is counted in stats.handlerErrors and the others still run.
export const EVENT_TYPES = ['fire', 'misfire', 'reload', 'drill_step', 'footfall', 'unit_march', 'command', 'fall', 'lie', 'gun', 'hoofbeat', 'activity', 'impact'];
const SUGAR = { fire: 'onFire', misfire: 'onMisfire', reload: 'onReload', drill_step: 'onDrillStep', footfall: 'onFootfall', unit_march: 'onUnitMarch', command: 'onCommand', fall: 'onFall', lie: 'onLie', gun: 'onGun', hoofbeat: 'onHoofbeat', activity: 'onActivity', impact: 'onImpact' };

export class AnimBus {
  constructor() {
    this.h = Object.fromEntries(EVENT_TYPES.map(t => [t, []])); this.stats = { handlerErrors: 0 }; for (const t of EVENT_TYPES) this.stats[t] = 0;
    for (const [t, name] of Object.entries(SUGAR)) this[name] = fn => this.on(t, fn);
    // reusable scratch carried to handlers
    this.pos = new Float32Array(3); this.dir = new Float32Array(3); this.cen = new Float32Array(3);
    this.fireInfo = { weaponId: null, gunIdx: -1, round: 'ball', mode: 'at_will', cycleIndex: 0, cycleS: 0, tier: 'inferred', ranksBack: 0, kneeling: 0, lying: 0, recoilM: 0, fuze: null, fuzeS: 0, shotId: 0 };
    this.reloadInfo = { drill: 'load_at_will', number: -1, tier: 'documented' };
    this.cmdInfo = { reactionS: 0.4, tier: 'plausible-procedural' };
    this.marchInfo = { surface: 'unknown', lengthM: 0, tier: 'documented' };
    this.fallInfo = { fate: 'killed', tier: 'plausible-procedural' };
    this.gunInfo = { recoilM: 0, recoilS: 0, tier: 'plausible-procedural' };
    this.actInfo = { clipset: '', tier: 'inferred' };
    this.impactInfo = { fireT: 0, weaponId: null, speedMs: 0, balls: 0, surface: 'earth', shotId: 0, tier: 'plausible-procedural' };
    this.footInfo = { surface: 'unknown' };
  }
  on(type, fn) { if (!this.h[type]) throw new Error('unknown event type ' + type); this.h[type].push(fn); return this; }
  off(type, fn) { const a = this.h[type]; const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); return this; }
  has(type) { return this.h[type].length > 0; }
  // emit with up to 10 positional arguments (no rest-array allocation)
  emit(type, a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
    this.stats[type]++; const hs = this.h[type];
    for (let i = 0; i < hs.length; i++) { try { hs[i](a0, a1, a2, a3, a4, a5, a6, a7, a8, a9); } catch (e) { this.stats.handlerErrors++; this.stats.lastError = String(e && e.message || e); } }
  }
}
export const createAnimBus = () => new AnimBus();
