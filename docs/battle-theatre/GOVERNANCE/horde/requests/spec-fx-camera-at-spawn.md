# Request: the picture at a time depends on where the camera stood when the clock was put there (effects layer: src/fx3d/index.mjs, src/fx-host.mjs)

From: bt-spec-health (spec loop), round 1, 2026-11-16. For: the owner of the effects layer (bt-renderer). This is not a defect the specs can fix and it is not a blocker for them; it is a limit that has become visible in a browser spec and that the owner has not been told about in this form. Nothing in `src/` was touched by this workstream.

## What was seen

`casualties.spec.mjs`, test "webgl2: men of a unit fall in the picture while it stands in a printed window, stand up again when the scrubber goes back, and the same time gives the same picture", source shell, SwiftShader, 1280 x 800, region 520 x 500 over the 121st Pennsylvania (log `tests/results/sw-round-1/diag-1-casualties-webgl2.log`):

* 14:59 to 15:29 on 1 July: 95.74 % of the pixels over the unit change (the fall, and the smoke of the printed engagement window EN-009 / row T1-147);
* two shots of the same time: 0.000 % differ (the picture is still when nothing moves);
* back at 14:59 after the detour: **48.951 % of the pixels differ from the first 14:59 picture**. The assertion "the men stand up again: the renderer tables are rewritten, not left lying" failed.

## Why (read in the source, then reproduced without a browser)

* `src/fx-host.mjs` `_drive` / `_replay`: after a seek (the clock goes back, or jumps more than `maxWindowS` = 30 s) the fire plan of the last `REPLAY_S` seconds is replayed into the effects handlers on the next frame.
* `src/fx3d/index.mjs` `onFire`: for every musket shot the route is chosen **at spawn** from `S.cam`, the camera of the last `update()`: nearer than `lod.near_radius_m` (150 m) the shot becomes near puffs in the store, farther it goes to the fog aggregator (`mode = 'fog'`, `agg.add(r)`). `app/docs/FX3D-NOTES.md` section 10 states this ("LOD route of a shot (near puff or far fog) is chosen at spawn from the camera then; a fast camera move shows pops until the next seek").
* So the same shots at the same time leave different sprites behind depending on the camera of the frame in which the replay ran. In the spec the first visit reached 14:59 with the camera still high over the field (the camera went down to the unit after the seek) and every later visit with the camera over the unit.
* Reproduction without a browser, `tests/results/sw-round-1/pre/fx-camera-at-spawn.mjs` (copy it to `tmp/bt-spec/pre/` to run; 2 s): 40 musket shots of one unit at one place and time, spawned with the camera 40 m over the place: **40 of 40 near puffs**; with the camera 3000 m up: **0 of 40 near, 40 of 40 fog** (and the frame at t has 0 events and 0 sprites in the first case, 5 events and 5 sprites in the second).

## What this means for the product (the owner decides)

The effects layer's header says a picture is a pure function of (event, sprite index, age), and the arrival of an event is a pure function of time. The route (near puff or fog) is a function of time AND of the camera history. Two people who scrub to the same minute with different cameras can see different smoke over the same men (the same mass of smoke, drawn two ways). That is the stated limit of section 10 for a fast camera move, but section 10 does not say that a seek is where it bites: the replay after a seek is the moment the route is fixed. It matters for the scrub-purity gate Q12 in pixels (any pixel comparison of two visits to a time is only meaningful with the same camera path) and for any future "same time, same picture" claim.

Options, none taken by this workstream:

1. Keep it, and say so in `FX3D-NOTES.md` section 10 (a seek replays from the camera of that moment) and wherever the owner lists known limits; the specs hold the camera fixed between visits (below).
2. Choose the route at draw time from the camera of the frame being drawn (the aggregated fog and the near puffs would then both be derived from the same events and one of the two drawn per frame), so that the picture is a function of (time, camera) only.
3. Re-replay when the camera crosses `near_radius_m` of a unit that fired in the replay window.

## What the specs do about it (STALE_TEST, not a weakening)

`casualties.spec.mjs` `aim()` now places the camera over the unit first and reaches the minute by a seek from half an hour earlier, so every visit is replayed from the same camera. No assertion or threshold changed. `scrub.spec.mjs` "pixel identity" and `structures3d.spec.mjs` "scrub purity" hold the camera fixed between the visits and are not affected. Browser confirmation of the mechanism (pictures with the weather and effects passes on and off, the same camera in both replays, and with the camera far during the replay): `tests/results/sw-round-1/diag-2-casualties-return.log` and `tmp/bt-spec/diag-out/` (queued first; see `tests/results/SW-STATUS.md` for the result).
