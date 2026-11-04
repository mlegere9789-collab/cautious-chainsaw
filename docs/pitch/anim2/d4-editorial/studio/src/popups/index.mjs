// popups/index.mjs - THE list of popups the Studio registers at start-up (one module each; order = update order and z-order tie-break).  To add a popup: write src/popups/<name>.mjs
// (copy popups/_template.mjs), import it here, add it to the array, run node build.mjs.  See popups/host.mjs for the card contract.
import { eventCard } from './event-card.mjs';
import { storyCard } from './story-card.mjs';
import { commandToast } from './command-toast.mjs';
import { commandCrossout } from './command-crossout.mjs';
import { unitCard } from './unit-card.mjs';
import { tour } from './tour.mjs';
import { dayBanner } from './day-banner.mjs';
import { legend } from './legend.mjs';
import { minimap } from './minimap.mjs';
import { hints } from './hints.mjs';
import { chronicle } from './chronicle.mjs';

// round 2: the clock badge is the masthead's clock (the date, the time and the uncertainty are there on every screen); it no longer lies on the map
export const POPUPS = [dayBanner, eventCard, storyCard, commandToast, commandCrossout, unitCard, tour, legend, minimap, hints, chronicle];
