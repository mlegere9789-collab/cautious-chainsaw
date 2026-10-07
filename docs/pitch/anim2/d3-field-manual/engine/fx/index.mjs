// fx/index.mjs - THE list of map effects the Studio registers at start-up (drawn between the backdrop and the tiles).  Each entry is { id, label, update(frame, engine), draw(ctx, frame, env) }.
// d3 fork: one effect, the names of places, laid out every frame so that no name lies under a mark (fx/places.mjs).  Nothing is drawn that the data does not support.
import { placesFx } from './places.mjs';
export const FX = [placesFx];
