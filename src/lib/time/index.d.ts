// Types for src/lib/time (WP-TIME-02).  CANDIDATE: nothing here ships until the owner and the historian approve the anchors (D-TIME).

export type Status = 'S' | 'M' | 'R' | 'D';
export type EvidenceClass = 'A' | 'B' | 'C' | 'D';
export type SignState = 'open' | 'proposed' | 'reviewed' | 'confirmed' | 'signed' | 'contested' | 'deferred' | 'withdrawn';
export type ReviewFlag = 'needs-historian' | 'owner-sign' | 'owner-decision' | 'evidence-weak' | 'none';
export type Phase = 'night' | 'dawn' | 'morning' | 'afternoon' | 'evening' | 'dusk';
export type LabelStyle = 'time' | 'day' | 'date' | 'long' | 'short' | 'compat' | 'chip' | 'iso' | 'aria' | 'frame';

/** One row of data-src/time/time_anchors.json. The runtime reads tick, t, sigma_min, status, and optionally state, review_flag, confidence, circular. */
export interface AnchorDoc {
  tick: number;
  /** "1863-07-03T15:00": local mean time, zone-less, to the minute */
  t: string;
  status: Status;
  confidence?: EvidenceClass;
  effective_status?: Status;
  sigma_min: number;
  range?: [string, string];
  label?: string;
  facts?: string[];
  fact_confidences?: Record<string, 'H' | 'M' | 'L'>;
  sources?: string[];
  families?: string[];
  evidence?: string;
  flags?: Array<'H' | 'O' | 'C' | 'M' | 'E' | 'W'>;
  review_flag?: ReviewFlag;
  state?: SignState;
  decision?: string | null;
  design?: true;
  circular?: true;
  note?: string;
}

export interface TimeAnchorsDoc {
  $schema?: string;
  schema: 1;
  version: string;
  release?: 'candidate' | 'signed';
  dv: number;
  notice?: string;
  tz: 'LMT';
  tz_note?: string;
  tick_max: number;
  tab_days: Array<[number, number]>;
  approx_sigma_min: number;
  sigma_cap_min: number;
  slope?: { min_min_per_tick?: number; warn_over?: number; error_over?: number };
  gaps: Array<{ from: number; to: number; policy: 'fast_forward' | 'time_lapse' }>;
  solar: Record<string, any>;
  evidence_families?: { strong: string[]; weak: string[] };
  anchors: AnchorDoc[];
}

/** What the ES-module route bundles (src/lib/time/anchors.runtime.generated.js): the fields makeTimeModel reads, no labels, facts or evidence text. */
export interface RuntimeAnchor {
  tick: number;
  t: string;
  status: Status;
  sigma_min: number;
  /** the status the model uses when it differs from `status` (t5: circular, imported as D) */
  effective_status?: Status;
  state?: SignState;
  review_flag?: ReviewFlag;
  circular?: true;
  range?: [string, string];
}
export interface RuntimeAnchorsDoc extends Omit<TimeAnchorsDoc, 'anchors' | 'notice' | 'tz_note' | 'evidence_families' | '$schema'> {
  anchors: RuntimeAnchor[];
}

export interface Clock {
  /** the tick actually used (clamped into 1..tickMax) */
  tick: number;
  /** the tick asked for */
  requested: number;
  /** true when requested was outside 1..tickMax */
  clamped: boolean;
  /** !clamped */
  exact: boolean;
  /** minutes since 1863-07-01T00:00 local mean time */
  minutes: number;
  /** "1863-07-03T15:00", rounded to the minute */
  iso: string;
  year: number;
  month: string;
  /** calendar day of month, rolls at midnight independently of the Day tab */
  date: number;
  weekday: string;
  hour24: number;
  minute: number;
  /** "3:00 PM" */
  time: string;
  /** Day tab (1..3): a tick range, never a date */
  tab: number;
  /** battle-minutes per tick in this segment */
  mpt: number;
  /** interpolated uncertainty, minutes (plus or minus) */
  sigmaMin: number;
  /** print "about" when sigma >= approx_sigma_min or the bounding anchors are not signed */
  approx: boolean;
  signed: boolean;
  /** before civil dawn or after nautical dusk */
  night: boolean;
  phase: Phase;
  /** "Night of July 1-2" between midnight and civil dawn, else null */
  nightOf: string | null;
  /** "July 1" or the nightOf text */
  dayLabel: string;
  /** strongest review flag among the bounding anchors */
  review: ReviewFlag;
  /** weakest evidence class among the bounding anchors */
  basis: EvidenceClass;
  /** segment slope over 15 min/tick */
  lull: boolean;
  /** a bounding anchor is status R (needs a historian) or state contested: show a range, not a time */
  contested: boolean;
  /** [minutes - sigma, minutes + sigma] since 1863-07-01T00:00 */
  band: [number, number];
  gap: 'fast_forward' | 'time_lapse' | null;
}

/** Options are checked like arguments: a wrong kind is a TypeError and a wrong value a RangeError that names the option; null and undefined mean "the default". */
export interface LabelOptions {
  /** one of the ten words (default 'long'); any other word is a RangeError, a non-string a TypeError */
  style?: LabelStyle;
  /** a whole number of minutes, 0 (to the minute) .. 1440; default 5 (format() and parts(): 0) */
  roundMin?: number;
  /** false | true | 'auto' (default): "about " prefix when the clock is approximate */
  approx?: boolean | 'auto';
}
/** every label style, in the order of the LabelStyle type (the one list the model, the bridge and the inline build share) */
export const STYLES: readonly LabelStyle[];

export interface LabelParts {
  tick: number;
  day: string;
  date: string;
  time: string;
  prefix: string;
  approx: boolean;
  text: string;
  night: boolean;
  nightOf: string | null;
  weekday: string;
  iso: string;
}

export interface AnchorInfo {
  tick: number;
  minutes: number;
  sigmaMin: number;
  /** the declared status */
  status: Status;
  /** the status the model uses (differs only for the circular t5: D) */
  effectiveStatus: Status;
  /** evidence class of the EFFECTIVE status (t5: 'D') */
  confidence: EvidenceClass;
  state: SignState;
  review: ReviewFlag;
  /** empty on the default model: labels are not in the runtime subset (use makeTimeModel(fullDocument)) */
  label: string;
  circular: boolean;
  facts: string[];
  range: [string, string] | null;
  approx: boolean;
}

export interface TimeModel {
  version: string;
  dv: number;
  release: string;
  tickMax: number;
  tabDays: Array<[number, number]>;
  gaps: Array<{ from: number; to: number; policy: string }>;
  approxSigmaMin: number;
  anchors: AnchorInfo[];
  /** throws TypeError on NaN/Infinity/non-numbers; clamps 0 and 676 with clamped:true */
  tickToClock(tick: number): Clock;
  /** ISO local time or minutes -> fractional tick, clamped to 1..tickMax; opts.extrapolate uses 5 min/tick beyond the ends (validation only). RangeError for a string that is not a real calendar time, TypeError for anything that is neither a string nor a finite number. */
  clockToTick(x: string | number, opts?: { extrapolate?: boolean }): number;
  clockToTickInfo(x: string | number): { tick: number; exact: boolean };
  /** accepted range of an anchor tick ({from, to, text: 'between about 5:10 and 7:00 PM', contested}); null for other ticks */
  anchorRange(tick: number): { from: string; to: string; text: string; contested: boolean } | null;
  tickToLabel(tick: number, opts?: LabelOptions): string;
  tickToLabelParts(tick: number, opts?: LabelOptions): LabelParts;
  tickToMinutes(tick: number): number;
  /** exact on the tick table: minutesToTick(tickToMinutes(t)) === t for every integer tick, and Math.floor(result) === floorTick(min) */
  minutesToTick(min: number, opts?: { extrapolate?: boolean }): number;
  /** greatest integer tick whose exact clock is <= min (0 before tick 1): the epsilon-free "which frame has the clock reached" */
  floorTick(min: number): number;
  minutesPerTick(tick: number): number;
  uncertaintyMin(tick: number): number;
  tabDay(tick: number): number;
  tabStart(day: number): number;
  /** roundMin: a whole number of minutes 0..1440 (RangeError / TypeError otherwise) */
  parts(tick: number, roundMin?: number): {
    year: number; monthNum: number; month: string; date: number; weekday: string; hour24: number; minute: number;
    dayIdx: number; minutes: number; mod: number; nightOf: string | null; phase: Phase;
  };
  format(tick: number, style?: LabelStyle, opts?: { roundMin?: number; approx?: boolean | 'auto' }): string;
  dayPart(tick: number): Phase;
  isApprox(tick: number): boolean;
  /** integer tick a real number of minutes away; never a no-op for |dm| >= half a segment except at the ends. TypeError unless both arguments are finite numbers (a string "60" is rejected, never concatenated) */
  tickAfterMinutes(tick: number, dm: number): number;
  gapAt(tick: number): { from: number; to: number; policy: string } | null;
  isGap(tick: number): boolean;
  /** decimal local hour of day, 0..24 */
  hour(tick: number): number;
  /** ?tick=538 | ?t=538 -> integer tick or null (hostile input returns null; out-of-range digits clamp) */
  resolveTickParam(q: { get(k: string): string | null } | Record<string, unknown> | null | undefined): number | null;
  ticksJson(): Array<[number, string, number, number, number]>;
  goldenCsv(): string;
}

/**
 * Throws Error for an invalid anchor set: first tick 1, last = tick_max, strictly increasing in tick AND minutes, slope inside doc.slope (default 0.75..60 min/tick).
 * effective_status (t5: D) sets the evidence class. A configuration value that is PRESENT is used exactly as written or refused (approx_sigma_min: 0 is 0, not the
 * default 10; a wrong status / state / review_flag / range / solar / tab_days / gaps is an Error); only an absent (undefined or null) value takes its default.
 * validateAnchors accepts and rejects the same values (tests/time/agreement.test.mjs).
 */
export function makeTimeModel(doc: TimeAnchorsDoc | { anchors: Array<Pick<AnchorDoc, 'tick' | 't' | 'sigma_min' | 'status'> & Partial<AnchorDoc>>; [k: string]: any }): TimeModel;
/** lean core (no tickToClock, tables or URL parsing); what the legacy bridge inlines */
export function makeCore(doc: object): Omit<TimeModel, 'tickToClock' | 'clockToTick' | 'clockToTickInfo' | 'tickToLabelParts' | 'ticksJson' | 'goldenCsv' | 'isGap' | 'anchors' | 'resolveTickParam'> & { _: unknown };
/** "1863-07-03T15:00" -> minutes since 1863-07-01T00:00; TypeError for a non-string, RangeError for anything that is not a real calendar time (2/30, 24:00) */
export function parseLocal(s: string): number;

export interface ValidationIssue { code: string; msg: string; tick?: number }
export interface ValidationReport {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: {
    anchors: number; byStatus: Record<string, number>; slopes: Array<{ from: number; to: number; minPerTick: number }>;
    lulls: Array<{ from: number; to: number; minPerTick: number }>; stalls: Array<{ from: number; to: number; minPerTick: number }>;
    evidenceFailures: number[]; needsHistorian: number[]; design: number[];
  };
}
/** TM-V1. NEVER throws, whatever it is given (null entries, wrong types, malformed ranges are reported as errors); opts.evidenceAsError turns the S-anchor evidence rule into an error. */
export function validateAnchors(doc: unknown, opts?: { evidenceAsError?: boolean }): ValidationReport;
/** validates, throws AnchorError on any error (invalid JSON text is one V1.json error), returns a model */
export function loadAnchors(input: string | TimeAnchorsDoc): TimeModel;
export class AnchorError extends Error { errors: ValidationIssue[] }
export function deriveSigma(range: [string, string], cap?: number): number;
export function mechanicalFlags(anchor: Partial<AnchorDoc>, strongFamilies: string[]): Array<'M' | 'E' | 'W'>;

export interface Playback {
  readonly rate: number;
  readonly minutes: number;
  readonly tick: number;
  setRate(r: number): Playback;
  seek(tick: number): Playback;
  seekMinutes(m: number): Playback;
  advance(dtMs: number): { tick: number; prevTick: number; crossed: [number, number] | null; gap: string | null; rate: number; done: boolean };
}
/**
 * Constant-clock ("Battle-time") playback: rate is battle-minutes per real second. `crossed` uses an exact, epsilon-free rule (tick k is crossed when
 * the clock first reaches the module's own clock value of k, model.floorTick): every tick is reported exactly once, never twice, and advance(0) reports none.
 * advance(dtMs) throws TypeError for a dt that is not a finite number.
 */
export function createPlayback(model: Pick<TimeModel, 'tickMax' | 'tickToMinutes' | 'minutesToTick' | 'floorTick' | 'gapAt'>, opts?: { rate?: number; tick?: number; maxDtMs?: number; gapRate?: number }): Playback;
/** Battle-minutes per real second at Story pace (2 ticks/s x speed x minutes per tick) */
export function storyPace(model: Pick<TimeModel, 'minutesPerTick'>, tick: number, speed?: number, ticksPerSecond?: number): { minPerSec: number; label: number };

export interface Bridge {
  version: string;
  dv: number;
  tickMax: number;
  /** a style that is not one of the ten words (undefined, a number, a Symbol, an object, an unknown string) is 'compat': the bridge never throws */
  f(tick: number, style?: LabelStyle | unknown): string;
  x(tick: number, style?: LabelStyle | unknown): string;
  after(tick: number, dm: number): number;
  hour(tick: number): number;
  phase(tick: number): Phase;
  tab(tick: number): number;
  approx(tick: number): boolean;
  tabStart(day: number): number;
  minutes(tick: number): number;
  tickAt(minutes: number): number;
}
/**
 * The legacy facade. Every numeric argument is coerced (ticks: NaN -> 1; minutes: NaN -> 0; +-Infinity and huge values clamp), so no argument can throw or
 * return NaN. 'frame' ("Frame 538 of 675") is for tooltips and ?debug=1 only (chapter 04 section 4.9): never visible text.
 */
export function makeBridge(model: Pick<TimeModel, 'version' | 'dv' | 'tickMax' | 'tickToLabel' | 'format' | 'tickAfterMinutes' | 'hour' | 'dayPart' | 'tabDay' | 'isApprox' | 'tabStart' | 'tickToMinutes' | 'minutesToTick'>): Bridge;

/** the runtime subset of the anchors (about 4 KB); the full 25 KB document is src/lib/time/anchors.generated.js, which no runtime module imports */
export const anchorsDoc: RuntimeAnchorsDoc;
declare const model: TimeModel;
export default model;
export const tickToClock: TimeModel['tickToClock'];
export const anchorRange: TimeModel['anchorRange'];
export const clockToTick: TimeModel['clockToTick'];
export const clockToTickInfo: TimeModel['clockToTickInfo'];
export const tickToLabel: TimeModel['tickToLabel'];
export const tickToLabelParts: TimeModel['tickToLabelParts'];
export const tickToMinutes: TimeModel['tickToMinutes'];
export const minutesToTick: TimeModel['minutesToTick'];
export const floorTick: TimeModel['floorTick'];
export const minutesPerTick: TimeModel['minutesPerTick'];
export const uncertaintyMin: TimeModel['uncertaintyMin'];
export const tabDay: TimeModel['tabDay'];
export const tabStart: TimeModel['tabStart'];
export const parts: TimeModel['parts'];
export const format: TimeModel['format'];
export const dayPart: TimeModel['dayPart'];
export const isApprox: TimeModel['isApprox'];
export const tickAfterMinutes: TimeModel['tickAfterMinutes'];
export const gapAt: TimeModel['gapAt'];
export const isGap: TimeModel['isGap'];
export const hour: TimeModel['hour'];
export const resolveTickParam: TimeModel['resolveTickParam'];
export const ticksJson: TimeModel['ticksJson'];
export const goldenCsv: TimeModel['goldenCsv'];
export const tickMax: number;
export const version: string;
export const dv: number;
export const anchors: AnchorInfo[];
