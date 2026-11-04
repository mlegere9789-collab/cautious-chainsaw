// The sound catalogue: every sound id the engine can play, with its synthesis recipe, level, spectrum family, priority and provenance family.
// Provenance families are what the 'What is in this build' panel lists (provenance.mjs). A family's kind at run time is decided by what is actually loaded:
// recordings that are loaded and licensed (ledger ids) raise it to real_type / real_standin, otherwise it is 'synthesized' (or 'reconstruction' for table-driven sounds).
import { SOURCE_PEAK_DB_1M } from './physics.mjs';
import { smallArmShot, cannonBoom, shellFlightLoop, burstSound, impactSound, handlingSound } from './synth-arms.mjs';
import { crowdShout, renderWord, commandPhrase, horseWhinny, horseSnort, hoofTexture, wheelRumble, marchingFeet } from './synth-voice.mjs';
import { insectNight, birdsong, rainBed, thunderRoll, windBed } from './synth-ambient.mjs';
import { drumRoll, bugleCall } from './synth-music.mjs';

/** Provenance families (panel rows). `ledger` lists ledger ids of recordings that can stand behind the family (data/audio3d/sources.json). */
export const FAMILIES = Object.freeze([
  { id: 'small_arms',  name: 'Rifle-muskets, smoothbores, carbines, revolvers (reports)', tier: 'plausible-procedural', ledger: ['FS-347647', 'FS-538795', 'FS-234869', 'FS-662875'], bestKind: 'real_type',
    gap: 'No recording of a Springfield, Enfield, Lorenz, Sharps, Spencer, Henry or cap-and-ball revolver is licensed (audio/PLAN.md 3.4). Recordings are generic black-powder muskets; the other weapons are the synthesis.', basis: 'Noise burst, thump, crack and tail shaped by weapon class; spectral centroid checked against the real musket recordings.' },
  { id: 'artillery_report', name: 'Field guns and howitzers (discharge)', tier: 'plausible-procedural', ledger: ['FS-125348', 'FS-182822', 'FS-187767', 'WC-SALUTE-CANNON'], bestKind: 'real_type',
    gap: 'One real Civil War reenactment cannon shot (gun type unknown) and compilations of unknown guns; no Napoleon, 3-inch rifle, Parrott or howitzer is identified.', basis: 'Pressure thump, low blast, crack and rumble per gun class (charge from the kit tables).' },
  { id: 'shell_flight', name: 'Shell and shot in flight', tier: 'plausible-procedural', ledger: ['FS-486026'], bestKind: 'real_standin',
    gap: 'No recording of a shell in flight (the one ledgered whistle is film foley). Rush for smoothbore shot, rush plus spin whine for rifled shell; the pitch is the builder\'s, not measured.', basis: 'Moving source with Doppler along the ballistic trajectory.' },
  { id: 'handling', name: 'Loading and handling (tearing a cartridge, rammer ring, ramming, cap)', tier: 'plausible-procedural', ledger: [], bestKind: 'synthesized',
    gap: 'No recording of drill handling sounds is ledgered; audible only within about 30 m; the steps and their timing are documented by the manuals (Hardee, Casey), the sounds are synthesis.', basis: 'Short resonant models per drill step; events come from the animation reload steps.' },
  { id: 'burst_impact', name: 'Shell bursts, canister, caisson, strikes on ground, wood, stone, men and horses', tier: 'plausible-procedural', ledger: [], bestKind: 'synthesized',
    gap: 'No recording exists in the ledger for bursts or impacts; everything is synthesis from the descriptions in audio/PLAN.md 3.2 (general knowledge, to be sourced).', basis: 'Per-surface resonant models.' },
  { id: 'voices_commands', name: 'Drill commands (documented words)', tier: 'plausible-procedural', ledger: [], bestKind: 'reconstruction',
    gap: 'The words are printed in the manuals; the 1863 voice, accent and cadence are not recorded.', basis: 'Formant synthesis of manual command words only (data/audio3d/commands.json).' },
  { id: 'voices_crowd', name: 'Cheers, rebel yell and battle shouting', tier: 'plausible-procedural', ledger: ['FS-162628', 'FS-442293'], bestKind: 'real_standin',
    gap: 'No recording of a Union cheer or the rebel yell as heard in 1863; the Union cheer has no documented description at all; the rebel yell is described in prose only (a 1938 veterans\' recording is an unchecked lead). Both are stylizations.', basis: 'Layered formant voices; rebel yell high and rising, cheer two-syllable and falling.' },
  { id: 'signals_bugle', name: 'Bugle and trumpet calls', tier: 'inferred', ledger: ['IA-TAPS', 'WC-TAPS', 'WC-ASSEMBLY', 'WC-RECALL', 'WC-ATTENTION', 'WC-RETREAT', 'WC-REVEILLE', 'WC-TATTOO', 'WC-TOCOLOR', 'WC-OFFICERSCALL', 'WC-MESSCALL', 'WC-SICKCALL', 'WC-ASSEMBLY-USMB', 'WC-RECALL-USMB'], bestKind: 'real_standin',
    gap: 'Call names and order are documented (Hardee 1861, Casey 1862: drill/drill_hardee.json); the notation is NOT in the extracted text (page images not transcribed), and the recordings are modern Army/Marine calls, which may differ in notes from 1863.', basis: 'Modern public-domain recordings of the calls of the same name; procedural bugle ready for a transcribed note table (calls.json).' },
  { id: 'signals_drum', name: 'Drum beats and the long roll', tier: 'plausible-procedural', ledger: ['FS-125347'], bestKind: 'real_standin',
    gap: 'Casey lists 15 general and 20 skirmisher beats by name; their rhythms are not in the extracted text.', basis: 'Rudimental roll; named beats are not rendered until transcribed.' },
  { id: 'horses_wheels', name: 'Hooves, harness, wagons, limbers, marching feet', tier: 'plausible-procedural', ledger: ['FS-18229'], bestKind: 'real_standin',
    gap: 'Gait timings are standard equestrian values (inferred, unsourced here); no recording of period wheels or harness.', basis: 'Per-horse phase and stride jitter; surface from the road/ground class.' },
  { id: 'ambient', name: 'Wind, rain, thunder, night insects, birds', tier: 'plausible-procedural', ledger: [], bestKind: 'synthesized',
    gap: 'Documented: rain and the thunderstorm about 18:00 on 3 July (Jacobs, secondary). Insects, birds and their onset are procedural (PDF S.4); no sourced description of ambient sound on the field.', basis: 'Weather drives rain, wind and thunder; sun band drives insects and birds.' },
  { id: 'propagation', name: 'Distance delay, loudness, muffling, echoes', tier: 'inferred', ledger: [], bestKind: 'reconstruction',
    gap: 'Physics is computed (delay = distance / c at the documented temperature; ISO 9613 absorption); humidity, wind profile, 1863 vegetation and acoustic shadow zones are inferred or open.', basis: 'audio/model/acoustics.mjs numbers; terrain from the modern DEM.' },
]);

const P = SOURCE_PEAK_DB_1M;
const arm = (kind, peak, extra = {}) => ({ family: 'small_arms', synth: { fn: smallArmShot, kind }, peakDb1m: peak, spectrum: 'small_arm', directivity: 0.35, priority: 1.0, variants: 6, kind: 'shot', ...extra });
const gun = (kind, peak, spectrum = 'cannon', extra = {}) => ({ family: 'artillery_report', synth: { fn: cannonBoom, kind }, peakDb1m: peak, spectrum, directivity: 0.45, priority: 3.0, variants: 4, kind: 'shot', ...extra });

/** Sound ids. peakDb1m = ASSUMED peak level at 1 m (physics.mjs). directivity = cos-lobe depth. priority = weight in the voice-budget mixer. */
export const SOUNDS = Object.freeze({
  'arms.rifle_musket': arm('rifle_musket', P.rifle_musket),
  'arms.smoothbore_musket': arm('smoothbore_musket', P.smoothbore_musket),
  'arms.carbine': arm('carbine', P.carbine),
  'arms.breechloader': arm('breechloader', P.carbine),
  'arms.repeater': arm('repeater', P.carbine - 1),
  'arms.revolver': arm('revolver', P.revolver),
  'gun.napoleon_12pdr': gun('napoleon_12pdr', P.napoleon_12pdr),
  'gun.rifle_3in': gun('rifle_3in', P.rifle_3in),
  'gun.parrott_10pdr': gun('parrott_10pdr', P.parrott_10pdr),
  'gun.parrott_20pdr': gun('parrott_20pdr', P.parrott_20pdr),
  'gun.howitzer_12pdr': gun('howitzer_12pdr', P.howitzer_12pdr, 'howitzer'),
  'gun.howitzer_24pdr': gun('howitzer_24pdr', P.howitzer_24pdr, 'howitzer'),
  'flight.smoothbore': { family: 'shell_flight', synth: { fn: shellFlightLoop, kind: 'smoothbore' }, peakDb1m: 118, spectrum: 'shell_flight', directivity: 0, priority: 1.6, variants: 2, kind: 'flight', loop: true },
  'flight.rifled':     { family: 'shell_flight', synth: { fn: shellFlightLoop, kind: 'rifled' },     peakDb1m: 122, spectrum: 'shell_flight', directivity: 0, priority: 1.8, variants: 2, kind: 'flight', loop: true },
  'burst.common_shell':    { family: 'burst_impact', synth: { fn: burstSound, kind: 'common_shell' },    peakDb1m: 165, spectrum: 'burst', directivity: 0, priority: 2.2, variants: 3, kind: 'burst' },
  'burst.spherical_case':  { family: 'burst_impact', synth: { fn: burstSound, kind: 'spherical_case' },  peakDb1m: 162, spectrum: 'burst', directivity: 0, priority: 2.2, variants: 3, kind: 'burst' },
  'burst.canister':        { family: 'burst_impact', synth: { fn: burstSound, kind: 'canister' },        peakDb1m: 140, spectrum: 'impact', directivity: 0, priority: 1.4, variants: 3, kind: 'burst' },
  'burst.caisson':         { family: 'burst_impact', synth: { fn: burstSound, kind: 'caisson' },         peakDb1m: 178, spectrum: 'burst', directivity: 0, priority: 3.5, variants: 2, kind: 'burst' },
  ...Object.fromEntries(['earth', 'wood', 'stone', 'iron', 'man', 'horse', 'water', 'air'].map((s) => [`impact.${s}`, { family: 'burst_impact', synth: { fn: impactSound, kind: s }, peakDb1m: s === 'man' || s === 'horse' ? 112 : 130, spectrum: 'impact', directivity: 0, priority: s === 'man' || s === 'horse' ? 0.5 : 1.0, variants: 4, kind: 'impact' }])),
  'handle.tear':   { family: 'handling', synth: { fn: handlingSound, kind: 'tear' },   peakDb1m: 62, spectrum: 'impact', directivity: 0, priority: 0.2, variants: 3, kind: 'handling' },
  'handle.rammer': { family: 'handling', synth: { fn: handlingSound, kind: 'rammer' }, peakDb1m: 72, spectrum: 'bugle', directivity: 0, priority: 0.2, variants: 3, kind: 'handling' },
  'handle.ram':    { family: 'handling', synth: { fn: handlingSound, kind: 'ram' },    peakDb1m: 70, spectrum: 'impact', directivity: 0, priority: 0.2, variants: 3, kind: 'handling' },
  'handle.cap':    { family: 'handling', synth: { fn: handlingSound, kind: 'cap' },    peakDb1m: 66, spectrum: 'small_arm', directivity: 0, priority: 0.2, variants: 3, kind: 'handling' },
  'crowd.cheer': { family: 'voices_crowd', synth: { fn: crowdShout, kind: 'cheer' }, peakDb1m: 118, spectrum: 'voice_crowd', directivity: 0.2, priority: 1.5, variants: 3, kind: 'crowd', perMan: true },
  'crowd.yell':  { family: 'voices_crowd', synth: { fn: crowdShout, kind: 'yell' },  peakDb1m: 120, spectrum: 'voice_crowd', directivity: 0.2, priority: 1.5, variants: 3, kind: 'crowd', perMan: true },
  'crowd.roar':  { family: 'voices_crowd', synth: { fn: crowdShout, kind: 'roar' },  peakDb1m: 116, spectrum: 'voice_crowd', directivity: 0.2, priority: 0.8, variants: 3, kind: 'crowd', perMan: true },
  'voice.command': { family: 'voices_commands', synth: { fn: commandPhrase, kind: 'phrase' }, peakDb1m: 108, spectrum: 'voice_single', directivity: 0.6, priority: 2.0, variants: 3, kind: 'command' },
  'horse.whinny': { family: 'horses_wheels', synth: { fn: horseWhinny, kind: 'whinny' }, peakDb1m: 100, spectrum: 'voice_single', directivity: 0.3, priority: 0.7, variants: 3, kind: 'animal' },
  'horse.snort':  { family: 'horses_wheels', synth: { fn: horseSnort, kind: 'snort' },  peakDb1m: 92,  spectrum: 'voice_single', directivity: 0.3, priority: 0.4, variants: 3, kind: 'animal' },
  'move.hooves':  { family: 'horses_wheels', synth: { fn: hoofTexture, kind: 'hooves' }, peakDb1m: 96, spectrum: 'hoof', directivity: 0, priority: 0.9, variants: 4, kind: 'move', loop: false, perUnit: true },
  'move.wheels':  { family: 'horses_wheels', synth: { fn: wheelRumble, kind: 'wheels' }, peakDb1m: 98, spectrum: 'wagon', directivity: 0, priority: 0.9, variants: 2, kind: 'move', loop: true },
  'move.feet':    { family: 'horses_wheels', synth: { fn: marchingFeet, kind: 'feet' }, peakDb1m: 94, spectrum: 'hoof', directivity: 0, priority: 0.6, variants: 3, kind: 'move', loop: false, perUnit: true },
  'signal.bugle': { family: 'signals_bugle', synth: { fn: bugleCall, kind: 'bugle' }, peakDb1m: 124, spectrum: 'bugle', directivity: 0.5, priority: 2.6, variants: 1, kind: 'signal' },
  'signal.drum':  { family: 'signals_drum', synth: { fn: drumRoll, kind: 'roll' }, peakDb1m: 112, spectrum: 'drum', directivity: 0.2, priority: 1.8, variants: 2, kind: 'signal' },
  'amb.insects': { family: 'ambient', synth: { fn: insectNight, kind: 'insects' }, peakDb1m: 62, spectrum: 'insects', directivity: 0, priority: 0.2, variants: 1, kind: 'bed', loop: true },
  'amb.birds':   { family: 'ambient', synth: { fn: birdsong, kind: 'birds' },     peakDb1m: 66, spectrum: 'insects', directivity: 0, priority: 0.2, variants: 1, kind: 'bed', loop: true },
  'amb.rain':    { family: 'ambient', synth: { fn: rainBed, kind: 'rain' },       peakDb1m: 70, spectrum: 'ambient_broad', directivity: 0, priority: 0.3, variants: 1, kind: 'bed', loop: true },
  'amb.wind':    { family: 'ambient', synth: { fn: windBed, kind: 'wind' },       peakDb1m: 62, spectrum: 'ambient_broad', directivity: 0, priority: 0.2, variants: 1, kind: 'bed', loop: true },
  'amb.thunder': { family: 'ambient', synth: { fn: thunderRoll, kind: 'thunder' }, peakDb1m: 150, spectrum: 'thunder', directivity: 0, priority: 2.0, variants: 3, kind: 'burst' },
});

/** Weapon id (kit/weapons.json id, kit artillery piece id, audio/contract/weapons.json name or numeric id) -> sound id. Unknown weapons fall back by class, never silently to another class. */
export const WEAPON_TO_SOUND = Object.freeze({
  // small arms: kit/weapons.json ids
  m1861_springfield: 'arms.rifle_musket', m1855_springfield: 'arms.rifle_musket', harpers_ferry_rifle_m1855: 'arms.rifle_musket', m1841_mississippi: 'arms.rifle_musket', p1853_enfield: 'arms.rifle_musket', p1856_58_enfield_short: 'arms.rifle_musket',
  lorenz_m1854: 'arms.rifle_musket', richmond_rifle: 'arms.rifle_musket', whitworth_rifle: 'arms.rifle_musket', kerr_rifle: 'arms.rifle_musket', imported_arms_not_covered: 'arms.rifle_musket', springfield_model_unspecified: 'arms.rifle_musket', scoped_target_rifle: 'arms.rifle_musket',
  m1842_smoothbore: 'arms.smoothbore_musket', smoothbore_69_musket_unspecified: 'arms.smoothbore_musket', buck_and_ball_load: 'arms.smoothbore_musket',
  sharps_rifle_m1859: 'arms.breechloader', sharps_carbine: 'arms.breechloader', sharps_unspecified_pattern: 'arms.breechloader', burnside_carbine: 'arms.breechloader', gallager_carbine: 'arms.breechloader', smith_carbine: 'arms.breechloader', merrill_carbine: 'arms.breechloader', sharps_hankins_carbine: 'arms.breechloader',
  richmond_carbine: 'arms.carbine', enfield_musketoon: 'arms.carbine', spencer_repeater: 'arms.repeater', henry_rifle: 'arms.repeater',
  colt_army_1860: 'arms.revolver', colt_navy_1851: 'arms.revolver', remington_1858: 'arms.revolver', lemat: 'arms.revolver', revolver_unspecified: 'arms.revolver', colt_pocket_revolver: 'arms.revolver', colt_36_unconfirmed: 'arms.revolver',
  // artillery: kit/weapons.json artillery piece ids
  napoleon_12pdr_m1857: 'gun.napoleon_12pdr', ames_rifled_bronze_napoleon: 'gun.napoleon_12pdr', '6pdr_field_gun': 'gun.napoleon_12pdr', '3inch_ordnance_rifle': 'gun.rifle_3in', '3inch_navy_rifle': 'gun.rifle_3in', '14pdr_james_rifle': 'gun.rifle_3in',
  '10pdr_parrott': 'gun.parrott_10pdr', '20pdr_parrott': 'gun.parrott_20pdr', '12pdr_whitworth': 'gun.rifle_3in', blakely_12pdr: 'gun.rifle_3in', '12pdr_howitzer': 'gun.howitzer_12pdr', '12pdr_mountain_howitzer': 'gun.howitzer_12pdr', '24pdr_howitzer': 'gun.howitzer_24pdr',
  // audio/contract/weapons.json names
  springfield_m1861: 'arms.rifle_musket', springfield_m1863: 'arms.rifle_musket', enfield_p1853: 'arms.rifle_musket', smoothbore_m1842: 'arms.smoothbore_musket', sharps_carbine_or_rifle: 'arms.breechloader', spencer_carbine: 'arms.repeater',
  revolver_colt_remington: 'arms.revolver', napoleon_12pdr: 'gun.napoleon_12pdr', ordnance_rifle_3in: 'gun.rifle_3in', parrott_10pdr: 'gun.parrott_10pdr', parrott_20pdr: 'gun.parrott_20pdr', whitworth_12pdr: 'gun.rifle_3in', blakely_rifle: 'gun.rifle_3in', howitzer_12pdr: 'gun.howitzer_12pdr', howitzer_24pdr: 'gun.howitzer_24pdr',
  // generic kinds the FX/animation layers may pass
  long_arm: 'arms.rifle_musket', handgun: 'arms.revolver', repeater: 'arms.repeater',
  musket: 'arms.rifle_musket', rifle: 'arms.rifle_musket', rifle_musket: 'arms.rifle_musket', smoothbore: 'arms.smoothbore_musket', carbine: 'arms.carbine', revolver: 'arms.revolver', cannon: 'gun.napoleon_12pdr', napoleon: 'gun.napoleon_12pdr', howitzer: 'gun.howitzer_12pdr',
});
/** Numeric ids of audio/contract/weapons.json. */
export const CONTRACT_ID_TO_WEAPON = Object.freeze(['springfield_m1861', 'springfield_m1863', 'enfield_p1853', 'lorenz_m1854', 'smoothbore_m1842', 'sharps_carbine_or_rifle', 'burnside_carbine', 'spencer_carbine', 'henry_rifle', 'revolver_colt_remington', 'napoleon_12pdr', 'ordnance_rifle_3in', 'parrott_10pdr', 'parrott_20pdr', 'whitworth_12pdr', 'blakely_rifle', 'howitzer_12pdr', 'howitzer_24pdr']);
/** Reload step name (BT-EVENTS 3.3) -> handling sound; steps with no sound return null. */
export const HANDLING_BY_STEP = Object.freeze({ tear_cartridge: 'handle.tear', draw_rammer: 'handle.rammer', return_rammer: 'handle.rammer', ram_cartridge: 'handle.ram', ram: 'handle.ram', prime: 'handle.cap', sponge: 'handle.ram' });
export function soundForWeapon(weapon) {
  const id = typeof weapon === 'number' ? CONTRACT_ID_TO_WEAPON[weapon] : weapon;
  return WEAPON_TO_SOUND[id] || null;
}
/** Artillery projectile kinds (FIRE_EVENT `proj`): 0 ball/Minie 1 buck and ball 2 blank 3 solid shot 4 common shell 5 spherical case 6 canister 7 double canister. */
export const PROJECTILES = Object.freeze(['ball_or_minie', 'buck_and_ball', 'blank', 'solid_shot', 'common_shell', 'spherical_case', 'canister', 'double_canister']);
export const burstSoundForProjectile = (proj) => ({ common_shell: 'burst.common_shell', spherical_case: 'burst.spherical_case', canister: 'burst.canister', double_canister: 'burst.canister' }[typeof proj === 'number' ? PROJECTILES[proj] : proj] || null);
export const impactSoundForSurface = (surface) => `impact.${['earth', 'wood', 'stone', 'iron', 'water', 'man', 'horse', 'air'].includes(surface) ? surface : 'earth'}`;
export const flightSoundForGun = (soundId) => (soundId === 'gun.napoleon_12pdr' || soundId.startsWith('gun.howitzer') ? 'flight.smoothbore' : 'flight.rifled');

/** Resolve the provenance of the families from the recordings actually loaded (ids from data/audio3d/sources.json). */
export function resolveFamilies(sourcesById, loaded = new Set()) {
  return FAMILIES.map((f) => {
    const srcs = f.ledger.map((id) => sourcesById[id]).filter(Boolean).map((s) => ({ ...s, shipped: loaded.has(s.ledgerId) }));
    const live = srcs.filter((s) => s.shipped);
    let kind = f.bestKind === 'reconstruction' ? 'reconstruction' : 'synthesized';
    if (live.length) kind = live.some((s) => s.weaponMatch === 'type') ? 'real_type' : 'real_standin';
    return { ...f, kind, sources: srcs };
  });
}
