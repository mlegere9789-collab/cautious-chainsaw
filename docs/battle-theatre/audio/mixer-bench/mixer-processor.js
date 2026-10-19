// Battle Theatre sample-playback mixer (AudioWorklet, plain JS, no allocation in process()).
// Every shot is one voice: sample-accurate start (retarded-time arrival), distance gain 1/r, muzzle directivity, 2-pole air-absorption
// low-pass from a distance table, Woodworth-style ITD + level difference + head-shadow low-pass (a small HRTF-style model), a shared
// reverb send (FDN-8 + three long echo taps for woods/ridges), Doppler from listener motion, voice stealing only when the pool is full.
// Event rows (Float64, stride 8): [tFire(s), x, y, z, dirX, dirZ, sampleIndex, gain]  + Float32 aux row (stride 2): [pitch, spare].
// Coordinates: metres, x east, y up, z north; heading h gives forward = (sin h, cos h) (same convention as render/prototype).
const BLOCK = 128, INV = 1 / 128, ES = 8;

class BattleMixer extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const o = options.processorOptions;
    this.sr = sampleRate; this.c = o.c ?? 343; this.V = o.maxVoices ?? 4096; this.full = (o.quality ?? 1) === 1;
    this.pool = o.pool; this.smpOff = o.smpOff; this.smpLen = o.smpLen;
    this.lpTab = o.lpTab; this.lpStep = o.lpStep; this.lpN = this.lpTab.length;      // distance (m) -> one-pole coefficient (per pole)
    this.gndLin = o.gndLin; this.wx = o.windX ?? 0; this.wz = o.windZ ?? 0; this.lagl = 1.6;
    this.statsCh = !!o.statsChannels; this.timer = o.timerSab ? new Int32Array(o.timerSab) : null; this.tps = o.ticksPerSec || 1;
    this.masterGain = o.masterGain ?? 1; this.refGain = o.refGain ?? 1;          // refGain: linear full-scale value of a 1 m reference peak
    this.revGain = o.revGain ?? 0.35; this.cullBelow = o.cullBelow ?? 1e-5;
    const V = this.V;
    this.vSmp = new Int32Array(V); this.vLast = new Int32Array(V); this.vPos = new Float64Array(V); this.vRate = new Float32Array(V); this.vBase = new Float32Array(V);
    this.vGL = new Float32Array(V); this.vGR = new Float32Array(V); this.vTGL = new Float32Array(V); this.vTGR = new Float32Array(V);
    this.vA = new Float32Array(V); this.vHS = new Float32Array(V); this.vItd = new Float32Array(V); this.vNearL = new Int8Array(V); this.vSend = new Float32Array(V);
    this.vY1 = new Float32Array(V); this.vY2 = new Float32Array(V); this.vY3 = new Float32Array(V); this.vWi = new Int32Array(V); this.vStart = new Int32Array(V); this.vAge = new Float64Array(V);
    this.vSx = new Float32Array(V); this.vSy = new Float32Array(V); this.vSz = new Float32Array(V); this.vDx = new Float32Array(V); this.vDz = new Float32Array(V); this.vSrcG = new Float32Array(V); this.vPitch = new Float32Array(V);
    this.ring = new Float32Array(V * 64);
    this.act = new Int32Array(V); this.nAct = 0; this.freeStack = new Int32Array(V); for (let i = 0; i < V; i++) this.freeStack[i] = V - 1 - i; this.nFree = V;
    // in-flight events (sound waves still travelling): slot store + min-heap on estimated arrival time
    const E = this.E = o.maxEvents ?? (1 << 17);
    this.ev = new Float64Array(E * ES); this.eAux = new Float32Array(E * 2); this.key = new Float64Array(E);
    this.heap = new Int32Array(E); this.hn = 0; this.evFree = new Int32Array(E); for (let i = 0; i < E; i++) this.evFree[i] = E - 1 - i; this.nEvFree = E;
    // listener
    this.lx = 0; this.ly = 0; this.lz = 0; this.lyaw = 0; this.lvx = 0; this.lvy = 0; this.lvz = 0; this.moved = true; this.rekey = false; this.blocksSinceRekey = 0;
    // buffers
    this.oL = new Float32Array(BLOCK); this.oR = new Float32Array(BLOCK); this.snd = new Float32Array(BLOCK);
    // reverb: FDN-8
    this.fdnLen = [1051, 1237, 1423, 1627, 1877, 2053, 2269, 2503]; this.fdnM = 4095; this.fdn = []; for (let k = 0; k < 8; k++) this.fdn.push(new Float32Array(4096));
    this.fdnW = 0; this.fdnDamp = new Float32Array(8); this.fdnG = new Float32Array(8); const rt60 = o.rt60 ?? 2.4;
    for (let k = 0; k < 8; k++) this.fdnG[k] = Math.pow(10, -3 * this.fdnLen[k] / (rt60 * this.sr));
    this.fdnDc = 0.35;
    // echo taps (woods edge, ridge, far ridge); seconds, gain, pan(-1..1)
    this.taps = o.taps ?? [{ t: 0.42, g: 0.20, p: -0.5 }, { t: 1.15, g: 0.15, p: 0.6 }, { t: 2.70, g: 0.09, p: 0.0 }];
    this.echoBuf = new Float32Array(1 << 18); this.echoW = 0; this.echoLp = 0;
    // stats
    this.s = { late: 0, lateDrop: 0, steals: 0, culled: 0, evDrop: 0, clips: 0, started: 0, maxAct: 0, maxFlight: 0, blocks: 0, procMax: 0, procSum: 0, over: 0, startedBlock: 0, rekeys: 0 };
    this.hist = new Uint32Array(200);                                              // process() time histogram, 25 us buckets
    this.statEvery = 128; this.statCount = 0; this.blkStarted = 0;
    this.port.onmessage = e => this.onMsg(e.data);
    if (o.events) this.addEvents(o.events, o.aux);
    if (o.listener) this.setListener(o.listener);
  }
  onMsg(m) {
    if (m.type === 'events') this.addEvents(m.ev, m.aux);
    else if (m.type === 'listener') this.setListener(m.l);
    else if (m.type === 'flush') this.flush();
    else if (m.type === 'final') this.port.postMessage({ type: 'final', ...this.snapshot(true) });
    else if (m.type === 'ping') this.port.postMessage({ type: 'pong', id: m.id, frame: currentFrame, t: currentTime });
  }
  setListener(l) { // [x,y,z,yaw,vx,vy,vz]
    if (l[0] !== this.lx || l[1] !== this.ly || l[2] !== this.lz || l[3] !== this.lyaw) this.moved = true;
    this.lx = l[0]; this.ly = l[1]; this.lz = l[2]; this.lyaw = l[3]; this.lvx = l[4] || 0; this.lvy = l[5] || 0; this.lvz = l[6] || 0; this.lagl = l[7] ?? 1.6;
  }
  flush() { for (let a = 0; a < this.nAct; a++) { const v = this.act[a]; this.freeStack[this.nFree++] = v; } this.nAct = 0;
    this.hn = 0; this.nEvFree = this.E; for (let i = 0; i < this.E; i++) this.evFree[i] = this.E - 1 - i; }
  travel(dx, dy, dz, d) { return d / (this.c - (this.wx * dx + this.wz * dz) / (d + 1e-6)); }   // wind adds to the sound speed along the path
  // ---- heap (min on key) ----
  hpush(id) { const h = this.heap, k = this.key; let i = this.hn++; const kv = k[id]; while (i > 0) { const p = (i - 1) >> 1; if (k[h[p]] <= kv) break; h[i] = h[p]; i = p; } h[i] = id; }
  hpop() { const h = this.heap, k = this.key; const top = h[0]; const last = h[--this.hn]; if (this.hn > 0) { let i = 0; const kv = k[last], n = this.hn; for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && k[h[c + 1]] < k[h[c]]) c++; if (k[h[c]] >= kv) break; h[i] = h[c]; i = c; } h[i] = last; } return top; }
  heapify() { const h = this.heap, k = this.key, n = this.hn; for (let s = (n >> 1) - 1; s >= 0; s--) { const id = h[s]; const kv = k[id]; let i = s; for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && k[h[c + 1]] < k[h[c]]) c++; if (k[h[c]] >= kv) break; h[i] = h[c]; i = c; } h[i] = id; } }
  addEvents(ev, aux) {
    const n = ev.length / ES, c = this.c, E = this.ev;
    for (let r = 0; r < n; r++) {
      if (this.nEvFree === 0) { this.s.evDrop++; continue; }
      const id = this.evFree[--this.nEvFree], o = id * ES, q = r * ES;
      for (let j = 0; j < ES; j++) E[o + j] = ev[q + j];
      this.eAux[id * 2] = aux ? aux[r * 2] : 1; this.eAux[id * 2 + 1] = aux ? aux[r * 2 + 1] : 0;
      const dx = E[o + 1] - this.lx, dy = E[o + 2] - this.ly, dz = E[o + 3] - this.lz;
      this.key[id] = E[o] + this.travel(dx, dy, dz, Math.sqrt(dx * dx + dy * dy + dz * dz)); this.hpush(id);
    }
  }
  snapshot(final) {
    const s = this.s; return { frame: currentFrame, active: this.nAct, inflight: this.hn, ...s, hist: final ? Array.from(this.hist) : undefined, free: this.nFree };
  }
  // ---- start a voice for event slot id, at sample offset 'off' within this block, 'late' samples already elapsed ----
  startVoice(id, off, late, d) {
    const E = this.ev, o = id * ES, s = this.s;
    const smp = E[o + 6] | 0, sg = E[o + 7] * this.refGain, pitch = this.eAux[id * 2];
    // distance gain (1/r, 1 m reference) and directivity
    const dx = E[o + 1] - this.lx, dy = E[o + 2] - this.ly, dz = E[o + 3] - this.lz;
    const dh = Math.sqrt(dx * dx + dz * dz) + 1e-6;
    const cosT = (E[o + 4] * (-dx) + E[o + 5] * (-dz)) / dh;                         // muzzle direction vs. direction to listener
    const g = sg * (1 + 0.35 * cosT) / Math.max(d, 2) * this.gnd(d);
    if (g < this.cullBelow) { s.culled++; this.evFree[this.nEvFree++] = id; return; }
    if (this.nFree === 0) { this.steal(); }
    const v = this.freeStack[--this.nFree];
    this.vSmp[v] = this.smpOff[smp]; this.vLast[v] = this.smpLen[smp] - 2; this.vPos[v] = late * pitch; this.vRate[v] = pitch; this.vSrcG[v] = sg; this.vPitch[v] = pitch;
    this.vSx[v] = E[o + 1]; this.vSy[v] = E[o + 2]; this.vSz[v] = E[o + 3]; this.vDx[v] = E[o + 4]; this.vDz[v] = E[o + 5];
    this.vY1[v] = 0; this.vY2[v] = 0; this.vY3[v] = 0; this.vWi[v] = 64; this.vStart[v] = off; this.vAge[v] = 0;
    this.control(v, true);
    this.act[this.nAct++] = v; this.evFree[this.nEvFree++] = id; s.started++; this.blkStarted++;
  }
  gnd(d) { let ti = (d / this.lpStep) | 0; if (ti >= this.lpN) ti = this.lpN - 1; const k = this.lagl >= 40 ? 0 : 1 - this.lagl * 0.025; return 1 - k * (1 - this.gndLin[ti]); }  // ISO 9613-2 ground effect, faded out with camera height
  steal() { // last resort: drop the quietest active voice (lowest current gain)
    let best = -1, bg = 1e9; for (let a = 0; a < this.nAct; a++) { const v = this.act[a]; const g = this.vGL[v] + this.vGR[v]; if (g < bg) { bg = g; best = a; } }
    const v = this.act[best]; this.act[best] = this.act[--this.nAct]; this.freeStack[this.nFree++] = v; this.s.steals++;
  }
  // per-voice control: distance, gains, pan/ITD, air LP, send, Doppler; first=true snaps the gain (no ramp)
  control(v, first) {
    const dx = this.vSx[v] - this.lx, dy = this.vSy[v] - this.ly, dz = this.vSz[v] - this.lz;
    const dh2 = dx * dx + dz * dz, dh = Math.sqrt(dh2) + 1e-6, d = Math.sqrt(dh2 + dy * dy);
    const cosT = (this.vDx[v] * (-dx) + this.vDz[v] * (-dz)) / dh;
    const g = this.vSrcG[v] * (1 + 0.35 * cosT) / Math.max(d, 2) * this.gnd(d);
    const fx = Math.sin(this.lyaw), fz = Math.cos(this.lyaw);                           // listener forward; right = (fz, -fx)
    const u = (dx * fz - dz * fx) / dh;                                               // +1 = hard right, -1 = hard left
    const p = (u + 1) * 0.5, th = p * 1.5707963267948966;
    this.vTGL[v] = g * Math.cos(th); this.vTGR[v] = g * Math.sin(th);
    if (first) { this.vGL[v] = this.vTGL[v]; this.vGR[v] = this.vTGR[v]; }
    let ti = (d / this.lpStep) | 0; if (ti >= this.lpN) ti = this.lpN - 1; this.vA[v] = this.lpTab[ti];
    this.vItd[v] = Math.abs(u) * 0.00066 * this.sr * (this.full ? 1 : 0); this.vNearL[v] = u <= 0 ? 1 : 0;
    this.vHS[v] = 0.55 - 0.40 * Math.abs(u);                                           // far-ear head-shadow low-pass coefficient (0.55 -> ~4.5 kHz, 0.15 -> ~1.2 kHz at 48 kHz)
    this.vSend[v] = g * (0.10 + 0.40 * Math.min(1, d / 1200));
    if (this.lvx !== 0 || this.lvz !== 0 || this.lvy !== 0) { const vr = (this.lvx * dx + this.lvy * dy + this.lvz * dz) / (d + 1e-6); this.vRate[v] = this.vPitch[v] * (1 + vr / this.c); }
  }
  process(inputs, outputs) {
    const t0 = this.timer ? Atomics.load(this.timer, 0) : 0;
    const out = outputs[0], outL = out[0], outR = out[1], sr = this.sr, c = this.c, s = this.s;
    const f0 = currentFrame, tEnd = (f0 + BLOCK) / sr;
    this.blkStarted = 0;
    // 1. re-key in-flight events if the listener moved (retarded-time arrival changes), about every 8 blocks
    if (this.moved) { this.blocksSinceRekey++; if (this.blocksSinceRekey >= 8) { this.blocksSinceRekey = 0; this.moved = (this.lvx !== 0 || this.lvz !== 0 || this.lvy !== 0); const E = this.ev, n = this.hn, h = this.heap;
      for (let i = 0; i < n; i++) { const id = h[i], o = id * ES; const dx = E[o + 1] - this.lx, dy = E[o + 2] - this.ly, dz = E[o + 3] - this.lz; this.key[id] = E[o] + this.travel(dx, dy, dz, Math.sqrt(dx * dx + dy * dy + dz * dz)); } this.heapify(); s.rekeys++; } }
    // 2. start voices whose wavefront reaches the listener in this block
    while (this.hn > 0 && this.key[this.heap[0]] < tEnd) {
      const id = this.hpop(), o = id * ES, E = this.ev;
      const dx = E[o + 1] - this.lx, dy = E[o + 2] - this.ly, dz = E[o + 3] - this.lz, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const fa = (E[o] + this.travel(dx, dy, dz, d)) * sr;                                                  // exact arrival frame (float)
      if (fa >= f0 + BLOCK) { this.key[id] = fa / sr; this.hpush(id); continue; }
      let off = Math.round(fa) - f0, late = 0; if (off < 0) { late = -off; off = 0; s.late++; if (late * this.eAux[id * 2] >= this.smpLen[E[o + 6] | 0] - 2) { s.lateDrop++; this.evFree[this.nEvFree++] = id; continue; } }
      this.startVoice(id, off, late, d);
    }
    // 3. control update for moving listener
    if (this.lvx !== 0 || this.lvz !== 0 || this.lvy !== 0 || this.moved) { for (let a = 0; a < this.nAct; a++) this.control(this.act[a], false); }
    // 4. voices
    const oL = this.oL, oR = this.oR, snd = this.snd; oL.fill(0); oR.fill(0); snd.fill(0);
    const pool = this.pool, ring = this.ring, act = this.act;
    const vPos = this.vPos, vRate = this.vRate, vSmp = this.vSmp, vLast = this.vLast, vA = this.vA, vHS = this.vHS, vGL = this.vGL, vGR = this.vGR, vTGL = this.vTGL, vTGR = this.vTGR;
    const vY1 = this.vY1, vY2 = this.vY2, vY3 = this.vY3, vWi = this.vWi, vStart = this.vStart, vItd = this.vItd, vNearL = this.vNearL, vSend = this.vSend, full = this.full;
    let na = this.nAct;
    for (let a = 0; a < na; a++) {
      const v = act[a];
      let pos = vPos[v]; const rate = vRate[v], base = vSmp[v], last = vLast[v], A = vA[v], HS = vHS[v], sendG = vSend[v];
      let y1 = vY1[v], y2 = vY2[v], y3 = vY3[v], wi = vWi[v], gl = vGL[v], gr = vGR[v];
      const dgl = (vTGL[v] - gl) * INV, dgr = (vTGR[v] - gr) * INV;
      let i = vStart[v]; vStart[v] = 0; let ended = false;
      if (full) {
        const itd = vItd[v], di = itd | 0, ff = itd - di, rb = v << 6, nearL = vNearL[v] === 1;
        for (; i < BLOCK; i++) {
          const ip = pos | 0; if (ip >= last) { ended = true; break; }
          const f = pos - ip, s0 = pool[base + ip], x = s0 + (pool[base + ip + 1] - s0) * f;
          y1 += A * (x - y1); y2 += A * (y1 - y2);
          ring[rb + (wi & 63)] = y2;
          const dly = ring[rb + ((wi - di) & 63)] * (1 - ff) + ring[rb + ((wi - di - 1) & 63)] * ff; wi++;
          y3 += HS * (dly - y3);
          if (nearL) { oL[i] += y2 * gl; oR[i] += y3 * gr; } else { oL[i] += y3 * gl; oR[i] += y2 * gr; }
          snd[i] += y2 * sendG; gl += dgl; gr += dgr; pos += rate;
        }
        vWi[v] = wi; vY3[v] = y3;
      } else {
        for (; i < BLOCK; i++) {
          const ip = pos | 0; if (ip >= last) { ended = true; break; }
          const f = pos - ip, s0 = pool[base + ip], x = s0 + (pool[base + ip + 1] - s0) * f;
          y1 += A * (x - y1);
          oL[i] += y1 * gl; oR[i] += y1 * gr; snd[i] += y1 * sendG; gl += dgl; gr += dgr; pos += rate;
        }
        vY2[v] = y2;
      }
      vPos[v] = pos; vY1[v] = y1; vY2[v] = y2; vGL[v] = gl; vGR[v] = gr;
      if (ended) { act[a] = act[--na]; a--; this.freeStack[this.nFree++] = v; }
    }
    this.nAct = na;
    // 5. shared reverb (FDN-8) + echo taps
    const fdn = this.fdn, fl = this.fdnLen, M = this.fdnM, fg = this.fdnG, fd = this.fdnDamp, dc = this.fdnDc, rev = this.revGain, mg = this.masterGain;
    let w = this.fdnW, ew = this.echoW; const eb = this.echoBuf, EM = eb.length - 1, taps = this.taps; let elp = this.echoLp; let clips = 0;
    for (let i = 0; i < BLOCK; i++) {
      const xin = snd[i];
      // echo bus
      elp += 0.25 * (xin - elp); eb[ew & EM] = elp; let eL = 0, eR = 0;
      for (let t = 0; t < taps.length; t++) { const tp = taps[t]; const sv = eb[(ew - ((tp.t * sr) | 0)) & EM] * tp.g; eL += sv * (1 - tp.p) * 0.5 + sv * 0.0; eR += sv * (1 + tp.p) * 0.5; }
      ew++;
      // FDN
      let sum = 0; const v0 = fdn[0][(w - fl[0]) & M], v1 = fdn[1][(w - fl[1]) & M], v2 = fdn[2][(w - fl[2]) & M], v3 = fdn[3][(w - fl[3]) & M], v4 = fdn[4][(w - fl[4]) & M], v5 = fdn[5][(w - fl[5]) & M], v6 = fdn[6][(w - fl[6]) & M], v7 = fdn[7][(w - fl[7]) & M];
      fd[0] += dc * (v0 - fd[0]); fd[1] += dc * (v1 - fd[1]); fd[2] += dc * (v2 - fd[2]); fd[3] += dc * (v3 - fd[3]); fd[4] += dc * (v4 - fd[4]); fd[5] += dc * (v5 - fd[5]); fd[6] += dc * (v6 - fd[6]); fd[7] += dc * (v7 - fd[7]);
      const a0 = fd[0] * fg[0], a1 = fd[1] * fg[1], a2 = fd[2] * fg[2], a3 = fd[3] * fg[3], a4 = fd[4] * fg[4], a5 = fd[5] * fg[5], a6 = fd[6] * fg[6], a7 = fd[7] * fg[7];
      sum = (a0 + a1 + a2 + a3 + a4 + a5 + a6 + a7) * 0.25;
      fdn[0][w & M] = a0 - sum + xin; fdn[1][w & M] = a1 - sum - xin * 0.7; fdn[2][w & M] = a2 - sum + xin * 0.5; fdn[3][w & M] = a3 - sum - xin * 0.3;
      fdn[4][w & M] = a4 - sum + xin * 0.6; fdn[5][w & M] = a5 - sum - xin * 0.4; fdn[6][w & M] = a6 - sum + xin * 0.2; fdn[7][w & M] = a7 - sum - xin * 0.8; w++;
      const wL = (a0 + a2 + a4 + a6) * 0.5 + eL, wR = (a1 + a3 + a5 + a7) * 0.5 + eR;
      let yl = (oL[i] + wL * rev) * mg, yr = (oR[i] + wR * rev) * mg;
      if (yl > 1 || yl < -1 || yr > 1 || yr < -1) clips++;
      // soft limiter: Pade tanh
      yl = yl > 3 ? 1 : yl < -3 ? -1 : yl * (27 + yl * yl) / (27 + 9 * yl * yl); yr = yr > 3 ? 1 : yr < -3 ? -1 : yr * (27 + yr * yr) / (27 + 9 * yr * yr);
      outL[i] = yl; outR[i] = yr;
    }
    this.fdnW = w; this.echoW = ew; this.echoLp = elp; s.clips += clips;
    // 6. stats
    const nA = this.nAct; if (nA > s.maxAct) s.maxAct = nA; if (this.hn > s.maxFlight) s.maxFlight = this.hn; s.blocks++;
    let ticks = 0;
    if (this.timer) { ticks = (Atomics.load(this.timer, 0) - t0) >>> 0; const us = ticks / this.tps * 1e6; s.procSum += us; if (us > s.procMax) s.procMax = us; if (us > 2666.7) s.over++; const b = Math.min(199, (us / 25) | 0); this.hist[b]++; }
    if (this.statsCh && out.length >= 8) { out[2].fill(nA); out[3].fill(this.hn); out[4].fill(this.blkStarted); out[5].fill(ticks / this.tps * 1e6); out[6].fill(s.steals); out[7].fill(s.lateDrop); }
    if (!this.statsCh && ++this.statCount >= this.statEvery) { this.statCount = 0; this.port.postMessage({ type: 'stats', ...this.snapshot(false) }); }
    return true;
  }
}
registerProcessor('battle-mixer', BattleMixer);
