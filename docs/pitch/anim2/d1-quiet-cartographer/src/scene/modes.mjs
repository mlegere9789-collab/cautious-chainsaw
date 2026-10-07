// scene/modes.mjs - the display-dynamics modes registered in kernel.motion (one Display class, three flag sets):
//   dynamics   critically damped glide of every tile's offset + collision-aware pushing + sequenced fades.  THE DEFAULT.
//   spring     the glide and the fades only (no pushing): shows what the pushing adds
//   snap       the layout exactly as solved, no glide, no fades: the lab's behaviour (46 pops per second at 4x), kept to compare against
import { Display } from './display.mjs';

const make = (flags) => ({ create(ctx) { const d = new Display(flags, ctx.tok); return { step: (L, inp) => d.step(L, inp), reset: () => d.reset(), display: d }; } });

export const MOTION_MODES = [
  { id: 'dynamics', label: 'Glide + pushing', doc: 'Offsets glide (critically damped) toward the certified layout; overlapping tiles push each other apart along the least penetration; hand-overs fade in sequence.', ...make({ glide: true, collide: true }) },
  { id: 'spring', label: 'Glide only', doc: 'Offsets glide toward the certified layout; no pushing (the safety net repairs any overlap).', ...make({ glide: true, collide: false }) },
  { id: 'snap', label: 'Snap (as solved)', doc: 'The layout exactly as solved each frame: no glide, no fades. The lab behaviour, for comparison.', ...make({ glide: false, collide: false }) },
];
