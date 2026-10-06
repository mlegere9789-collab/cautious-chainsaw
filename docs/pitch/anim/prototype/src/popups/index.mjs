// popups/index.mjs - THE list of popups the Studio registers at start-up.  EMPTY on purpose: the popup track registers the site's existing popups here (every one is kept and improved,
// none removed).  Each entry is { id, label, update(frame, api) -> cards[] }; see popups/host.mjs for the card contract and the free-space placement they get.
export const POPUPS = [];
