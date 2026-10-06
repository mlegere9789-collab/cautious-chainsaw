"""make-tokens.py - generates tokens.json (the single source of every dial of the Battle Studio) from a compact table.
Edit the table, run `python docs/pitch/anim/prototype/tokens/make-tokens.py`, then `node docs/pitch/anim/prototype/build.mjs` (regenerates tokens.schema.json and the bundle).
tokens.json itself may also be edited by hand: nothing depends on this script."""
import json, os

G = [("time", "Time and transport"), ("interp", "Motion between keyframes"), ("layout", "Layout: tiles never obscure"), ("motion", "Display dynamics"),
     ("camera", "Camera"), ("scene", "Scene"), ("skin", "Skin"), ("backdrop", "Backdrop"), ("metrics", "Metrics")]
T = []


def num(id, g, label, default, mn, mx, step, unit, doc, ev="Design", src=None):
    d = dict(id=id, group=g, type="number", label=label, default=default, min=mn, max=mx, step=step, unit=unit, doc=doc, evidence=ev)
    if src:
        d["source"] = src
    T.append(d)


def boo(id, g, label, default, doc, ev="Design"):
    T.append(dict(id=id, group=g, type="boolean", label=label, default=default, doc=doc, evidence=ev))


def sel(id, g, label, default, options, doc, ev="Design"):
    T.append(dict(id=id, group=g, type="select", label=label, default=default, options=[dict(value=v, label=l) for v, l in options], doc=doc, evidence=ev))


def reg(id, g, label, default, registry, doc, ev="Design"):
    T.append(dict(id=id, group=g, type="registry", registry=registry, label=label, default=default, doc=doc, evidence=ev))


# ---- time ----
num("time.baseTps", "time", "Ticks per second at 1x", 2, 0.5, 8, 0.5, "ticks/s", "How many ticks 1x plays per second. The site plays 500 ms per tick (2 ticks per second); the speed buttons multiply this.", "Documented", "docs/plan/specialists/app-time.md row J (bundle constant 500)")
num("time.fixedHz", "time", "Simulation step rate", 120, 30, 240, 10, "Hz", "The clock advances in exact steps of 1/rate seconds; the renderer interpolates between steps. Independent of the display refresh rate.")
num("time.maxFrameMs", "time", "Longest frame the clock accepts", 100, 20, 500, 10, "ms", "A frame longer than this (a stalled or hidden tab) advances the clock by this much only, so the battle cannot fast-forward after a stall.")
num("time.speedRampMs", "time", "Speed ease time", 220, 0, 1000, 10, "ms", "Play, pause and speed changes ease in and out over about this time (0 = instant).")
num("time.glideMs", "time", "Seek glide time", 450, 0, 2000, 25, "ms", "A seek or a jump to a scene flies the clock to the target with a critically damped glide of this time constant instead of teleporting.")
num("time.glideMaxTps", "time", "Seek glide speed cap", 120, 10, 600, 10, "ticks/s", "The glide never flies faster than this, so a long jump is a fly-through of the interpolated paths, not a blur.")
sel("time.endBehavior", "time", "At the end of the battle", "stop", [("stop", "Stop at tick 675"), ("loop", "Loop to tick 1")], "What happens when playback reaches the last tick.")
# ---- interp ----
reg("interp.model", "interp", "Motion model", "pchip", "interp", "How a unit moves between its own keyframes. All models are exact at every keyframe; between keyframes the position is Modelled.", "Modelled")
sel("interp.endSlopes", "interp", "Start and stop", "rest", [("rest", "Start and stop at rest"), ("edge", "Keep the edge velocity")], "Whether a unit's track starts and ends at rest (eased) or with the velocity of its first and last segment.", "Modelled")
num("interp.strengthTweenMs", "interp", "Strength bar tween", 350, 0, 1500, 25, "ms", "When a unit's current keyframe changes its strength, the bar eases to the new value over this time. The value itself is the keyframe's, never interpolated into numbers that are not in the data.")
# ---- layout ----
reg("layout.strategy", "layout", "Layout strategy", "certified", "layout", "Which layout module places the tiles. certified guarantees zero overlap; raw is a diagnostic that shows the unsolved problem.")
sel("layout.visibility", "layout", "Which units are on the map", "carry", [("carry", "Carry forward (what the site draws today)"), ("window", "Fresh keyframes only (within a window)"), ("snapshot", "Latest snapshot only")], "The visibility rule decides how many tiles exist at all (typical 384 under carry-forward, 44 under a window, 7 under the snapshot; 03-data-fuel.md section 9.1).", "Computed")
num("layout.windowTicks", "layout", "Fresh window", 24, 1, 120, 1, "ticks", "Under the window rule a unit is shown only within this many ticks before or after one of its own keyframes.")
num("layout.dMaxPx", "layout", "Displacement budget", 48, 0, 120, 1, "px", "How far a tile may sit from its true position so it can be read (a pin and a leader line stay on the true position). 0 = pure aggregation. Beyond the budget the tile is merged into an aggregate.", "Computed", "docs/pitch/anim/06-layout.md 4.4")
num("layout.gapPx", "layout", "Clearance between tiles", 2, 0, 6, 0.5, "px", "Minimum free space between any two tile boxes.")
num("layout.bandPx", "layout", "Split hysteresis band", 12, 0, 40, 1, "px", "An aggregate tries to split only when its members would fit within the budget minus this band, so it does not flicker.")
num("layout.relaxPxPerSec", "layout", "Return speed", 120, 0, 600, 10, "px/s", "How fast a displaced tile drifts back toward its true position when there is room.")
num("layout.splitDwellMs", "layout", "Aggregate dwell", 500, 0, 3000, 50, "ms", "An aggregate exists at least this long before a split is tried (merge now, split later).")
num("layout.labelShowDelayMs", "layout", "Label show delay", 200, 0, 1500, 50, "ms", "A name label may appear only after it has fitted for this long (it disappears at once when it stops fitting).")
num("layout.labelCooldownMs", "layout", "Label cool-down", 1200, 0, 5000, 100, "ms", "After a name label is hidden (something took its place) it may not come back for this long, so a label does not blink while tiles jostle.")
num("layout.labelMinZoom", "layout", "Labels from zoom", 12, 8, 18, 0.5, "zoom", "Below this zoom no name labels are drawn.")
num("layout.kCap", "layout", "Neighbourhood cap", 60, 10, 200, 5, "obstacles", "A neighbourhood with more obstacles than this is declared saturated and the tile aggregates (a conservative failure: never an overlap).")
boo("layout.pinProtect", "layout", "Protect true positions", True, "No tile may cover another tile's true position.")
boo("layout.labels", "layout", "Name labels", True, "Show the secondary name labels where they fit.")
num("layout.continuityPx", "layout", "Continuity radius", 0, 0, 120, 1, "px per frame", "EXPERIMENT. A tile that already has a place never jumps farther than this from it in one frame: when the only free place is farther it merges into an aggregate instead. Measured to multiply aggregate churn by ten at 14 px (see README), so it is off; the display layer travels instead. 0 = off.")
sel("layout.solveEvery", "layout", "Solve cadence", "auto", [("auto", "Automatic (follows the frame time)"), ("1", "Every frame"), ("2", "Every second frame"), ("3", "Every third frame")], "How often the certified layout is re-solved. In between, the solved tiles move with their units (same offsets, new true positions) and every displayed frame is still verified. Automatic raises it when frames run long on a slow device and lowers it again when there is room.")
num("layout.maxSplitTries", "layout", "Split trials per frame", 2, 1, 8, 1, "aggregates", "At most this many aggregates try to split in one frame.")
# ---- motion ----
reg("motion.mode", "motion", "Display dynamics", "dynamics", "motion", "dynamics = smooth glide with collision-aware pushing; spring = smooth glide only; snap = show the layout as solved (the lab behaviour, for comparison).")
num("motion.smoothMs", "motion", "Glide time", 110, 0, 500, 5, "ms", "Time constant of the glide that carries a tile to its newly solved position.")
num("motion.maxSpeedPxPerSec", "motion", "Glide speed cap", 1600, 100, 6000, 100, "px/s", "A displaced tile never glides faster than this.")
num("motion.travelPx", "motion", "Travel distance", 24, 4, 120, 2, "px", "A tile whose solved place is farther than this from where it stands does not push its way there: it dims below 0.5 opacity, glides through, and solidifies on arrival, so it neither obscures nor is obscured on the way.")
num("motion.travelMs", "motion", "Travel glide time", 60, 10, 300, 5, "ms", "Glide time constant of a dimmed travelling tile.")
num("motion.dimOpacity", "motion", "Travel opacity", 0.42, 0.1, 0.49, 0.01, "opacity", "Opacity of a travelling tile; must stay below 0.5, the opacity rule's threshold between solid and not solid.")
num("motion.maxPushPx", "motion", "Largest push", 1.5, 0.5, 40, 0.5, "px per pass", "A contact moves a tile by at most this much per pass, so tiles are eased apart instead of shoved. What still overlaps is repaired by the safety net.")
num("motion.collisionIters", "motion", "Collision passes", 4, 0, 12, 1, "passes", "Passes of the pushing solver per frame.")
num("motion.fadeMs", "motion", "Fade time", 220, 0, 1000, 10, "ms", "Duration of a tile's fade in or out. Two tiles that hand over to each other never both have opacity of 0.5 or more at once.")
num("motion.birthScale", "motion", "Birth size", 0.6, 0.2, 1, 0.05, "x", "A new tile grows from this fraction of its size, pushing its neighbours gently aside.")
num("motion.labelFadeMs", "motion", "Label fade time", 140, 0, 600, 10, "ms", "Fade of a name label.")
num("motion.cutFadeMs", "motion", "Cross-fade time of a cut", 140, 0, 600, 10, "ms", "When the picture changes too much for a glide (a jump in time or zoom) the old tiles fade out and the new ones fade in, in sequence.")
num("motion.cutZoomJump", "motion", "Zoom jump that cuts", 0.6, 0.1, 3, 0.1, "zoom levels per frame", "A zoom change larger than this in one frame is a cut (cross-fade) instead of a glide.")
num("motion.cutTickJump", "motion", "Time jump that cuts", 3, 0.5, 50, 0.5, "ticks per frame", "A tick change larger than this in one frame is a cut (cross-fade) instead of a glide.")
boo("motion.safetyNet", "motion", "Safety net", True, "Every displayed frame is verified; of two solid tiles that would still overlap the lighter one is dimmed below 0.5 and travels to its certified place (counted). Turn off only to measure how often it fires.")
sel("motion.reduced", "motion", "Reduced motion", "auto", [("auto", "Follow the system setting"), ("on", "Always reduce"), ("off", "Never reduce")], "Reduced motion lands seeks at once and shows the layout as solved, with short fades.")
# ---- camera ----
num("camera.zoom", "camera", "Zoom", 14, 11, 18, 0.05, "zoom", "Map zoom (Mapbox 512 px world). The site opens at 13.5; desktop views are clamped to 12.04 or more.", "Documented", "docs/pitch/anim/01-current-tiles-jitter.md")
num("camera.zoomGlideMs", "camera", "Zoom glide", 180, 0, 800, 10, "ms", "Wheel zoom glides with this time constant.")
num("camera.panGlideMs", "camera", "Pan glide", 120, 0, 800, 10, "ms", "Camera moves (scene jumps) glide with this time constant.")
num("camera.minZoom", "camera", "Lowest zoom", 11, 8, 14, 0.5, "zoom", "Lowest zoom the Studio allows.")
num("camera.maxZoom", "camera", "Highest zoom", 18, 14, 20, 0.5, "zoom", "Highest zoom the Studio allows (the site's maximum is 18).", "Documented", "docs/pitch/anim/01-current-tiles-jitter.md")
# ---- scene ----
boo("scene.leaders", "scene", "Leader lines", True, "Draw a thin line from a displaced tile to its pin on the true position.")
boo("scene.pins", "scene", "True-position pins", True, "Draw a pin on the true position of every displaced tile.")
boo("scene.hulls", "scene", "Aggregate member dots", True, "Draw a dot on the true position of every record an aggregate stands for.")
num("scene.hitSlopPx", "scene", "Click tolerance", 4, 0, 16, 1, "px", "Extra pixels around a tile that still count as a click on it.")
# ---- skin ----
reg("skin.id", "skin", "Skin", "reference", "skins", "The skin that draws the tiles. The Studio ships one built-in REFERENCE skin that exercises every channel; design pitches register their own.")
boo("skin.ageChannel", "skin", "Last-fix age channel", True, "Reference skin: dim and dash the outline of a tile whose latest keyframe is old, so a carried-forward tile does not look like a fresh report (03-data-fuel.md).")
# ---- backdrop ----
reg("backdrop.id", "backdrop", "Backdrop", "paper", "backdrops", "Schematic ground. Mapbox tiles are token-restricted, so the Studio draws a plain metric grid; it is not terrain.")
num("backdrop.gridM", "backdrop", "Grid spacing", 500, 100, 2000, 100, "m", "Spacing of the metric grid.")
boo("backdrop.places", "backdrop", "Place marks", True, "Show the 30 named places of terrain.json in the legacy frame the placements were authored in. 8 of them differ from production terrain.json by 166 to 733 m (Computed in the dataset); marks are orientation only.", "Computed")
# ---- metrics ----
boo("metrics.overlay", "metrics", "Metrics overlay", False, "Show frame times, motion, overlap and solve cost live.")
num("metrics.historyFrames", "metrics", "History length", 240, 60, 1200, 30, "frames", "Frames kept for the graphs and the export.")
num("metrics.popPx", "metrics", "Pop threshold", 3, 1, 20, 1, "px", "A tile that moves more than this beyond its true position's own motion in one frame counts as a pop (the lab definition).", "Computed", "docs/pitch/anim/layout-lab/lib/dynamic.mjs POP_PX")
boo("metrics.verify", "metrics", "Verify every frame", True, "Run the independent overlap verifier on every displayed frame (about 0.2 ms).")

# ---- popups (the Overlay Director and every popup style): tokens/make-popup-tokens.py ----
import importlib.util
_ps = importlib.util.spec_from_file_location("make_popup_tokens", os.path.join(os.path.dirname(os.path.abspath(__file__)), "make-popup-tokens.py"))
_pm = importlib.util.module_from_spec(_ps)
_ps.loader.exec_module(_pm)
_pm.add(G, num, boo, sel, reg)

doc = dict(format="battle-studio-tokens/1", version=1, groups=[dict(id=i, label=l) for i, l in G], tokens=T)
here = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(here, "tokens.json"), "w", encoding="utf8", newline="\n") as f:
    json.dump(doc, f, indent=1, ensure_ascii=False)
    f.write("\n")
print(len(T), "tokens written")
