"""make-popup-tokens.py - the dials of the POPUPS (the Overlay Director and every popup style), appended to the Battle Studio's token table by make-tokens.py.
One group per popup style, so the Tuning Studio shows one section per popup: Tune > "Popup: event card" ... .  Add a dial = add a row here, read it with tok('popup.<style>.<name>') in
src/popups/<style>.mjs, run `python tokens/make-tokens.py` and `node build.mjs`; test/tuning.test.mjs fails on a dial that is defined and never read, or read and never defined."""

GROUPS = [
    ("popups", "Popups: director (all popups)"),
    ("popup-style", "Popups: look (all popups)"),
    ("popup-event", "Popup: event card"),
    ("popup-story", "Popup: story card"),
    ("popup-toast", "Popup: command-change toast"),
    ("popup-crossout", "Popup: commander cross-out"),
    ("popup-unit", "Popup: unit card and hover"),
    ("popup-tour", "Popup: auto tour"),
    ("popup-banner", "Popup: day banner"),
    ("popup-clock", "Popup: clock"),
    ("popup-legend", "Popup: legend"),
    ("popup-minimap", "Popup: overview map"),
    ("popup-hints", "Popup: hints"),
    ("popup-chronicle", "Popup: chronicle strip"),
]

SRC_RESEARCH = "docs/pitch/anim/02-popups.md"


def add(G, num, boo, sel, reg):
    G.extend(GROUPS)
    # ---------------------------------------------------------------- director
    g = "popups"
    boo("popup.enabled", g, "Popups", True, "Master switch of every popup. Off hides all cards, chips, the rail and the Chronicle strip; the map is unchanged.")
    num("popup.motion.enterMs", g, "Enter time", 220, 0, 1000, 10, "ms", "A card arrives with a decelerating curve over this time. One motion language for every popup (02-popups.md rule 7: 220 ms in, 160 ms out).", "Design", SRC_RESEARCH)
    num("popup.motion.exitMs", g, "Exit time", 160, 0, 1000, 10, "ms", "A card leaves with an accelerating curve over this time; shorter than the enter so leaving never holds the viewer up.", "Design", SRC_RESEARCH)
    num("popup.motion.moveOutMs", g, "Relocation: fade out", 110, 0, 600, 10, "ms", "A card whose place is being taken by tiles fades out where it was for this long. It never glides across the map, so it never passes over a tile.")
    num("popup.motion.moveInMs", g, "Relocation: fade in", 200, 0, 800, 10, "ms", "...and fades in at its new, free place over this time.")
    num("popup.motion.risePx", g, "Enter rise", 6, 0, 24, 1, "px", "A card rises this far while it fades in. Kept under the clear gap so the moving card never touches a tile; 0 = fade only. Reduced motion always uses 0.")
    num("popup.motion.leaderMs", g, "Leader draw time", 240, 0, 1000, 10, "ms", "The line from a card to the tile it is about draws itself from the card to the tile over this time.", "Design", SRC_RESEARCH)
    num("popup.motion.pulseMs", g, "Subject ring pulse", 700, 0, 2000, 50, "ms", "A ring on the subject tile grows and fades once when its card appears (0 = no pulse).")
    num("popup.motion.arrivalCueMs", g, "Chip arrival cue", 1400, 0, 5000, 100, "ms", "A chip in the strip shows its leader line to the subject tile for this long when it arrives, then only while hovered, focused or pinned (a permanent line from the dock across the map would be noise).")
    num("popup.place.gridPx", g, "Occupancy grid cell", 4, 2, 16, 2, "px", "Resolution of the free-space search. Finer cells find tighter gaps and cost more; the test is conservative either way (a touched cell counts as occupied).")
    num("popup.place.gapPx", g, "Clear gap to tiles", 6, 0, 24, 1, "px", "A card keeps at least this much clear ground around every chip, label, pin and aggregate dot (the vital core of a tile).", "Design", SRC_RESEARCH)
    num("popup.place.marginPx", g, "Screen margin", 10, 0, 40, 1, "px", "A card keeps this far from the edges of the map.")
    num("popup.place.obstacleOpacity", g, "Tiles that count as obstacles", 0.2, 0.02, 0.5, 0.01, "opacity", "A tile at least this opaque is something a card must not cover. Lower than the layout's solid threshold (0.5) on purpose: a tile fading in or gliding past is about to be solid.")
    num("popup.place.anchorOffsetPx", g, "Distance from the subject", 14, 0, 60, 1, "px", "How far from the subject tile a card is first tried.")
    num("popup.place.maxLeaderPx", g, "Longest leader line", 420, 120, 1200, 20, "px", "A card whose nearest free place is farther than this from its subject is not floated: a chip in the strip with an arrival cue says it better than a line across the map. Cards with no chip form (tooltips, hints) ignore it.")
    num("popup.place.crossPenalty", g, "Leader crossing penalty", 40, 0, 200, 5, "px", "A candidate place whose leader line would cross another tile is judged this many pixels farther away per tile crossed. Leaders are drawn beneath tiles, so a crossing hides nothing, but a clean line reads better.")
    num("popup.place.stayPull", g, "Stay-put pull", 0.35, 0, 1, 0.05, "x", "When a card must move, a place near where it was is preferred by this weight against a place near the subject.")
    num("popup.place.relocateMarginPx", g, "Relocation trigger", 3, 0, 20, 1, "px", "A card whose clear ground to the nearest tile has shrunk below this starts a calm fade-relocation. A tile that actually touches it cuts it at once.")
    num("popup.place.upgradeAfterMs", g, "Form upgrade patience", 900, 200, 5000, 100, "ms", "A card pushed down the ladder (full, compact, chip) tries the richer form again after things have been calm this long.")
    num("popup.queue.aliveA", g, "Critical cards alive at once", 2, 1, 8, 1, "cards", "How many tier A cards (critical events, stories) may be full or compact at once. A newer one turns the oldest into a chip: nothing is evicted, a chip never evicts a card.", "Design", SRC_RESEARCH)
    num("popup.queue.aliveB", g, "High cards alive at once", 1, 0, 6, 1, "cards", "How many tier B cards (high events) may be compact at once; the rest are chips.")
    num("popup.queue.aliveChips", g, "Chips alive at once", 3, 1, 10, 1, "chips", "How many chips the Chronicle strip shows at once. Older chips leave the strip; their rows stay in the Chronicle.")
    num("popup.queue.chipMinShowMs", g, "Chip: shortest time on show", 1500, 0, 6000, 100, "ms", "A chip is not pushed out of the strip by newer ones before it has been on show this long (at 16x a new moment arrives every half second; the Chronicle keeps every row either way).")
    num("popup.speed.fullMaxX", g, "Full cards up to", 2, 0.25, 16, 0.25, "x speed", "Up to this playback speed critical cards are full, high events compact. 02-popups.md 5.6: events arrive 24 per minute at 1x and 95 at 4x.", "Computed", SRC_RESEARCH)
    num("popup.speed.compactMaxX", g, "Compact cards up to", 4, 0.25, 32, 0.25, "x speed", "Up to this speed critical cards are compact and high events chips; beyond it only critical cards remain, as chips.", "Computed", SRC_RESEARCH)
    num("popup.speed.chipMaxX", g, "Chips up to", 16, 1, 64, 1, "x speed", "Beyond this speed no card is raised at all; the Chronicle still lists every row.", "Computed", SRC_RESEARCH)
    num("popup.read.wpm", g, "Reading speed", 238, 120, 400, 2, "words/min", "Words per minute a card's lifetime assumes. 238 is the adult silent-reading figure of Brysbaert's meta-analysis as summarised by the BPS Research Digest (the paper itself was not opened); the product's own read time uses 200.", "Documented", SRC_RESEARCH)
    num("popup.dwell.aBaseMs", g, "Critical card: base time", 1500, 0, 6000, 100, "ms", "Time a critical card is held before reading time is added.")
    num("popup.dwell.aMinMs", g, "Critical card: shortest life", 3000, 500, 20000, 250, "ms", "A critical card is never shorter than this, whatever its length (wall-clock, only while the battle plays).")
    num("popup.dwell.aMaxMs", g, "Critical card: longest life", 12000, 2000, 60000, 500, "ms", "A critical card never outstays this; a pinned card never expires.")
    num("popup.dwell.bBaseMs", g, "High card: base time", 1200, 0, 6000, 100, "ms", "Time a high-significance card is held before reading time is added.")
    num("popup.dwell.bMinMs", g, "High card: shortest life", 2200, 500, 20000, 250, "ms", "Shortest life of a high-significance card.")
    num("popup.dwell.bMaxMs", g, "High card: longest life", 8000, 1500, 40000, 500, "ms", "Longest life of a high-significance card.")
    num("popup.dwell.chipMinMs", g, "Chip: shortest life", 2500, 500, 10000, 250, "ms", "A chip stays at least this long in the strip.")
    num("popup.dwell.chipMaxMs", g, "Chip: longest life", 4500, 1000, 20000, 250, "ms", "A chip never stays longer than this, and a card demoted to a chip is cut to it.")
    num("popup.land.delayMs", g, "Landing delay", 250, 0, 2000, 50, "ms", "After a seek or a step the clock must be still this long before the cards of the moment it landed on appear (scrubbing raises none).")
    num("popup.land.clearTicks", g, "Seek clears cards farther than", 3, 0, 50, 1, "ticks", "When a seek begins, cards that belong to a moment farther than this from where it is going leave (pinned cards stay). 02-popups.md F-05: no stale toasts after a jump.", "Design", SRC_RESEARCH)
    num("popup.dismiss.recallTicks", g, "Dismissed card returns after", 225, 10, 675, 5, "ticks", "A dismissed card comes back when the clock has moved this far from its moment (one day = 225), or at once from the Chronicle.", "Design", SRC_RESEARCH)
    num("popup.a11y.liveMinGapMs", g, "Screen-reader announcements", 2000, 500, 10000, 250, "ms", "At most one announcement per this time in the polite live region; when several cards arrive together one message names the most important and counts the rest.", "Design", SRC_RESEARCH)
    sel("popup.narrate.mode", g, "Narrated mode", "off", [("off", "Off"), ("critical", "Slow down while a critical card is read"), ("cards", "Slow down while any card is read")], "While a card is being read the clock eases to a fraction of its speed and back, so a card can be read without pausing. Owner decision D-1 of 02-popups.md; off by default.", "Design")
    num("popup.narrate.factor", g, "Narrated speed factor", 0.25, 0.1, 1, 0.05, "x", "The playback speed is multiplied by this while a card is being read in Narrated mode.")
    num("popup.rail.widthPx", g, "Reading rail width", 360, 260, 560, 10, "px", "Width of the docked reading panel. The map viewport shrinks by this much, the ground staying put, so reading never lies on a tile.", "Design", SRC_RESEARCH)
    num("popup.rail.animMs", g, "Rail open time", 260, 0, 800, 10, "ms", "Time the map takes to make room for the rail (and the phone sheet).")
    num("popup.sheet.peekPx", g, "Phone sheet: peek height", 132, 80, 260, 4, "px", "Height of the bottom sheet at its peek detent on a phone-sized screen.")
    num("popup.sheet.halfFrac", g, "Phone sheet: half height", 0.34, 0.2, 0.7, 0.02, "of screen", "Height of the bottom sheet at its half detent as a share of the screen.")
    num("popup.phone.belowPx", g, "Phone layout below", 700, 400, 1000, 10, "px wide", "Below this screen width cards are chips in the lane and everything long opens in the bottom sheet (no free-standing cards: 02-popups.md 3.7 found no free ground on a phone).", "Measured", SRC_RESEARCH)
    num("popup.hud.returnDelayMs", g, "Persistent popup return delay", 900, 0, 5000, 100, "ms", "A clock, legend or overview that stepped aside for a tile comes back only after its place has been clear this long, so it does not flicker.")
    # ---------------------------------------------------------------- look
    g = "popup-style"
    sel("popup.style.palette", g, "Palette", "dispatch", [("dispatch", "Dispatch (gilt and ivory on ink-navy)"), ("signal", "Signal (higher contrast)"), ("mono", "Mono (ink only)")], "Colour family of every popup. Colour is never the only cue: every tone also has a shape and a word.")
    sel("popup.style.density", g, "Density", "comfortable", [("comfortable", "Comfortable"), ("compact", "Compact")], "Padding and line spacing of every card.")
    num("popup.style.radiusPx", g, "Corner radius", 10, 0, 24, 1, "px", "Corner radius of cards, chips and the rail.")
    num("popup.style.blurPx", g, "Glass blur", 12, 0, 24, 1, "px", "Backdrop blur behind a card; 0 = opaque panels (also what a browser without backdrop-filter shows).")
    sel("popup.style.titleFont", g, "Title face", "serif", [("serif", "Serif (Georgia: the site's titles)"), ("sans", "Sans")], "Typeface of story, tour and banner titles.")
    num("popup.style.fontScale", g, "Text size", 1, 0.85, 1.3, 0.05, "x", "Scales the type of every popup (13 px body at 1.0; 02-popups.md 5.8 asks for 13 px reading text and 11 px captions at least).")
    sel("popup.style.shadow", g, "Elevation", "soft", [("none", "Flat"), ("soft", "Soft"), ("lifted", "Lifted")], "Shadow under cards: how far they stand off the map.")
    # (the per-style groups are filled by the style modules below)
    for fn in STYLE_TOKENS:
        fn(G, num, boo, sel, reg)


STYLE_TOKENS = []


def style(fn):
    STYLE_TOKENS.append(fn)
    return fn


# ------------------------------------------------------------------------------------------------------------------------------------------ event card
@style
def _event(G, num, boo, sel, reg):
    g = "popup-event"
    boo("popup.event.enabled", g, "Event cards", True, "Show a card for each chronology event (134 events of significance critical, high or medium; 3 'low' rows are listed in the Chronicle only).")
    num("popup.event.fullW", g, "Full card width", 400, 300, 520, 10, "px", "Width of the full event card (critical events at slow speeds). 02-popups.md measured tile-free ground for 460 x 150 in only 27 % of moments at the default zoom, so the ladder starts narrower.", "Measured", SRC_RESEARCH)
    num("popup.event.peekW", g, "Peek width", 300, 220, 400, 10, "px", "Width of the event peek: the kicker, the first three lines of the sentence and the place. Tried when the full and compact cards find no free ground; the whole sentence is one click away (the tools button opens it in the reading panel).")
    num("popup.event.miniW", g, "Mini width", 270, 200, 340, 10, "px", "Width of the smallest event card on the map: the kicker and two lines of the sentence. Below it only the chip in the strip remains.")
    num("popup.event.compactW", g, "Compact card width", 320, 240, 420, 10, "px", "Width of the compact event card (the sentence, no narrative).")
    sel("popup.event.highAs", g, "High-significance events", "card", [("card", "Compact card"), ("chip", "Chip in the strip")], "How the 73 'high' events appear: a compact card (tier B) or only a chip. Tier B cards are shorter-lived than critical ones.")
    sel("popup.event.mediumAs", g, "Medium-significance events", "chip", [("chip", "Chip in the strip"), ("off", "Chronicle only")], "How the 16 'medium' events appear. Never as a free-standing card.")
    sel("popup.event.narrative", g, "Narrative note", "disclosure", [("disclosure", "Behind 'Why it matters'"), ("inline", "Always shown"), ("rail", "Only in the reading rail")], "Where the italic narrative of the 25 events that have one is shown.")
    num("popup.event.landTicks", g, "Landing window", 0.5, 0, 6, 0.5, "ticks", "When the clock settles within this many ticks after an event, its card appears (the card of the moment you stopped on).")
    boo("popup.event.frameSubject", g, "Keep the subject in view", False, "When an event card appears for a unit that is off-screen, pan the map just enough to bring it in. Off: an edge arrow points to it instead.")


# ------------------------------------------------------------------------------------------------------------------------------------------ story card
@style
def _story(G, num, boo, sel, reg):
    g = "popup-story"
    boo("popup.story.enabled", g, "Story cards", True, "Show a card for each of the 24 vignettes when the clock reaches its trigger tick.")
    num("popup.story.peekW", g, "Peek width", 360, 280, 480, 10, "px", "Width of the story peek: title, place, the first lines of the summary and 'Read the full story'.")
    num("popup.story.miniW", g, "Mini width", 270, 200, 340, 10, "px", "Width of the smallest story card on the map: the title and one line of the summary. Below it only the chip in the strip remains.")
    num("popup.story.compactW", g, "Compact width", 300, 240, 400, 10, "px", "Width of the compact story card (title and two lines).")
    num("popup.story.peekLines", g, "Summary lines in the peek", 3, 1, 8, 1, "lines", "How many lines of the summary the peek shows before 'Read the full story'; the full summary and script are one action away.")
    num("popup.story.landTicks", g, "Landing window", 2, 0, 12, 1, "ticks", "A story is eligible for this many ticks after its trigger (the product uses 2).", "Documented", SRC_RESEARCH)
    sel("popup.story.autoRail", g, "Open the full story automatically", "never", [("never", "Never"), ("paused", "When the clock has stopped on it"), ("always", "Always")], "When to open the reading rail on a story without a click. Opening it never covers tiles: the map makes room.")
    num("popup.story.wpm", g, "Read-time estimate", 200, 120, 400, 2, "words/min", "Words per minute of the '~N min read' label. The product uses 200; the reading budget of the card itself uses popup.read.wpm.", "Documented", SRC_RESEARCH)


# ------------------------------------------------------------------------------------------------------------------------------------------ toasts
@style
def _toast(G, num, boo, sel, reg):
    g = "popup-toast"
    boo("popup.toast.enabled", g, "Command-change toasts", True, "Show a card for each of the 42 command changes (a general killed, wounded, captured, relieved, promoted, or arriving) when the clock reaches its tick.")
    num("popup.toast.w", g, "Toast width", 300, 240, 400, 10, "px", "Width of a command-change toast.")
    num("popup.toast.coalesceTicks", g, "Merge changes within", 3, 0, 20, 1, "ticks", "Command changes this close together become one card ('4 command changes', expandable); tick 550 alone has four.", "Computed", SRC_RESEARCH)
    num("popup.toast.miniW", g, "Mini width", 270, 200, 340, 10, "px", "Width of the smallest command-change card: the kind, the clock and the sentence. Below it only the chip in the strip remains.")
    num("popup.toast.maxItems", g, "Changes in one card", 4, 1, 8, 1, "changes", "At most this many command changes are merged into one card; the next one starts a new card (tick 550 has four, ticks 551 and 552 four more).")
    boo("popup.toast.showSource", g, "Show the source", True, "Show the per-row source of each command change (42 of 42 rows have one) as a Documented chip.")
    sel("popup.toast.minKind", g, "Which changes raise a toast", "all", [("all", "All 42"), ("fall", "Killed, wounded, captured only")], "Filter for fast playback. The Chronicle always lists all 42.")


# ------------------------------------------------------------------------------------------------------------------------------------------ cross-out
@style
def _crossout(G, num, boo, sel, reg):
    g = "popup-crossout"
    boo("popup.crossout.enabled", g, "Commander cross-out", True, "Revived dead popup (02-popups.md P-04): when a command changes, the old commander's name is struck through on the unit's tile and the new name takes its place. Needs a free place next to the tile.")
    num("popup.crossout.holdMs", g, "Time on the map", 2400, 800, 8000, 100, "ms", "How long the cross-out label stays (the product's dead card faded after 1.2 s and left at 3 s).")
    num("popup.crossout.strikeAtMs", g, "Strike after", 600, 0, 3000, 50, "ms", "When the old name is struck through, after the label appears.")
    num("popup.crossout.w", g, "Width", 240, 180, 360, 10, "px", "Width of the cross-out label.")


# ------------------------------------------------------------------------------------------------------------------------------------------ unit card
@style
def _unit(G, num, boo, sel, reg):
    g = "popup-unit"
    boo("popup.unit.enabled", g, "Unit card and hover", True, "The hover tooltip (a dead popup revived, P-05) and the card of a selected unit (P-06): who, how strong, where it stands.")
    num("popup.unit.tipDelayMs", g, "Hover delay", 350, 0, 2000, 50, "ms", "A tile must be hovered this long before its tooltip appears. The tooltip stays while the pointer is on the tile or on it, and Esc dismisses it (WCAG 1.4.13).")
    num("popup.unit.tipW", g, "Tooltip width", 250, 200, 340, 10, "px", "Width of the hover tooltip.")
    num("popup.unit.cardW", g, "Unit card width", 300, 240, 400, 10, "px", "Width of the selected-unit card.")
    num("popup.unit.recent", g, "Recent positions", 5, 1, 12, 1, "keyframes", "How many of a unit's latest placement keyframes the unit card lists (Modelled: hand-authored positions).")
    boo("popup.unit.casualties", g, "Casualty figures", True, "Show the order-of-battle casualty total (Documented, secondary source: Busey and Martin as the file metadata claims; the source was not re-read here). Never drawn as a per-keyframe value.")


# ------------------------------------------------------------------------------------------------------------------------------------------ tour
@style
def _tour(G, num, boo, sel, reg):
    g = "popup-tour"
    boo("popup.tour.enabled", g, "Auto tour", True, "The 16-stop tour of the production site (P-07). Opens in the rail; the map flies to the stop and the subject is framed in the free part of the screen (the product's drawer hid its own subject).")
    num("popup.tour.speedX", g, "Playback speed at a stop", 2, 0.25, 16, 0.25, "x speed", "Speed the clock plays at during a stop (the product uses 2x).", "Documented", SRC_RESEARCH)
    num("popup.tour.msPerTick", g, "Play time per tick of the window", 250, 50, 1000, 25, "ms", "A stop plays its tick window for this long per tick, then pauses (the product: tickWindow x 250 ms).", "Documented", SRC_RESEARCH)
    boo("popup.tour.restoreSpeed", g, "Restore the speed on close", True, "Closing the tour puts the playback speed back as it was.")
    boo("popup.tour.autoplay", g, "Play each stop", True, "Play the stop's tick window after the map has flown there; off: the clock is set to the stop and stays paused.")


# ------------------------------------------------------------------------------------------------------------------------------------------ banner
@style
def _banner(G, num, boo, sel, reg):
    g = "popup-banner"
    boo("popup.banner.enabled", g, "Day banners", True, "A title card when the clock enters a new day or a new part of the day (dawn, dusk, night), from the clock module. The product has none (P-39).")
    num("popup.banner.holdMs", g, "Time on screen", 3200, 1000, 10000, 100, "ms", "How long a banner stays (wall-clock, only while the battle plays).")
    num("popup.banner.w", g, "Banner width", 440, 280, 640, 10, "px", "Width of the banner ribbon.")
    boo("popup.banner.phases", g, "Parts of the day", True, "Also announce night and dawn (from the candidate clock, labelled Modelled), not only the three days.")


# ------------------------------------------------------------------------------------------------------------------------------------------ clock
@style
def _clock(G, num, boo, sel, reg):
    g = "popup-clock"
    boo("popup.clock.enabled", g, "Clock badge", True, "The date, time and speed badge (P-10). It prints only what the clock module says: 'about 10:15 AM', always Modelled while the anchors are candidates.")
    boo("popup.clock.sigma", g, "Show the uncertainty", True, "Show the clock's stated uncertainty (plus or minus minutes, interpolated from the anchors' own estimates).")
    boo("popup.clock.ring", g, "Day progress ring", True, "A ring for how much of the day's ticks have passed (Computed from the three tick ranges).")
    sel("popup.clock.slot", g, "Home", "tl", [("tl", "Top left"), ("tr", "Top right"), ("bl", "Bottom left"), ("br", "Bottom right")], "Where the badge lives. It steps aside (and returns after a calm delay) when a tile would be under it; the toolbar clock always shows the same time.")


# ------------------------------------------------------------------------------------------------------------------------------------------ legend
@style
def _legend(G, num, boo, sel, reg):
    g = "popup-legend"
    boo("popup.legend.enabled", g, "Legend", True, "What the tile marks mean, generated from the active skin's own legend() so it can never describe a renderer that no longer exists (02-popups.md F-13: 3 of 11 swatches matched).")
    sel("popup.legend.slot", g, "Home", "bl", [("tl", "Top left"), ("tr", "Top right"), ("bl", "Bottom left"), ("br", "Bottom right")], "Where the legend lives. It steps aside for a tile and returns after a calm delay; the About tab always has the same legend.")


# ------------------------------------------------------------------------------------------------------------------------------------------ minimap
@style
def _minimap(G, num, boo, sel, reg):
    g = "popup-minimap"
    boo("popup.minimap.enabled", g, "Overview map", True, "A small overview of every unit on the field with the viewport box (P-13). Click to fly. It pulses when a card is about something off-screen.")
    num("popup.minimap.w", g, "Width", 168, 100, 280, 4, "px", "Width of the overview map.")
    sel("popup.minimap.slot", g, "Home", "br", [("tl", "Top left"), ("tr", "Top right"), ("bl", "Bottom left"), ("br", "Bottom right")], "Where the overview lives. It steps aside for a tile and returns after a calm delay.")


# ------------------------------------------------------------------------------------------------------------------------------------------ hints
@style
def _hints(G, num, boo, sel, reg):
    g = "popup-hints"
    boo("popup.hints.enabled", g, "Hints", True, "Short contextual hints (P-38): how to play, step, select, and read the Chronicle. Each shows once and goes when used. Press ? for the full list.")
    num("popup.hints.holdMs", g, "Hint time", 6500, 2000, 20000, 250, "ms", "How long a hint stays when nothing is done (wall-clock).")
    num("popup.hints.maxShown", g, "Hints per session", 4, 0, 8, 1, "hints", "At most this many hints are shown in a session.")


# ------------------------------------------------------------------------------------------------------------------------------------------ chronicle
@style
def _chronicle(G, num, boo, sel, reg):
    g = "popup-chronicle"
    boo("popup.chronicle.enabled", g, "Chronicle", True, "The strip in the dock that carries the chips and the list of everything that has happened so far (events, stories, command changes). Nothing is ever dropped: a card that finds no room is a chip here.")
    boo("popup.chronicle.low", g, "Include low-significance rows", True, "List the 3 'low' chronology rows too (they never raise a card).")
    num("popup.chronicle.recentRows", g, "Rows in the list", 60, 10, 400, 10, "rows", "How many of the latest rows the Chronicle list renders (older ones scroll in on request).")
