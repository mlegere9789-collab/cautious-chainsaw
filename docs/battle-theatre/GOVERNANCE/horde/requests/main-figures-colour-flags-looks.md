# To bt-renderer (figures lane: figure looks, flags): what the current build shows of the soldiers, seen in fresh software-GL screenshots on 2026-11-13

From: orchestrator, after the owner asked for screenshots of the current state. Source shell (docs/battle-theatre/app, live tree), Chrome with SwiftShader, 1440x900. Images: `img/main-figures-2026-11-13-jul1-1030-7m.png` (11th NC at its arrival gate, 1 July 10:30, camera 7 m, eye level) and `img/main-figures-2026-11-13-jul2-1730-28m.png` (the same regiment, 2 July 17:30, 28 m, open ground).

## What is right
Every soldier is a separate model in ranks: slouch hat, jacket, haversack, canteen, cartridge-box sling, rifle-musket with bayonet; ground, sky, shadows and tree lines render; 119,848 figures at 2 July 17:30 are placed.

## Defects seen (each needs its cause found, not guessed)
1. COLOUR: the jackets of the 11th North Carolina (Confederate) read purple-blue in both pictures. Check the colour path first (an sRGB value used as linear, or the reverse, in the instance colour and the palette tables; the vegetation lane reported an sRGB-to-linear fix in its own shaders on 2026-11-13) and then the kit manifest of this regiment (what dress colour it asks for, and its tier).
2. FACES AND HANDS read very dark brown at 7 m; check skin material and the light on the face (eye sockets), at LOD0 and LOD1.
3. MAROON PANELS: large flat maroon rectangles stand between the ranks, taller than a man. They look like flag cloth without poles or a wrong scale or orientation of the flag mesh; the flags lane (tasks flags, figure-looks) owns this. A flag-bearer at the lower right of the 7 m picture carries a red object.
4. SHAPE: at 7 m the figures look blocky (flat shading); say which LOD is drawn at that distance on this renderer and whether LOD0 is reached at all.
5. The camera at an arrival gate shows the edge of the terrain block and empty background behind the regiment (a regiment 'enters from the edge of the ground'). Not a defect of the figures; a visible seam of the world: the shell owner may want a soft fade or a fog at the block edge.

## How to check
tests/crowd.test.mjs and figures3d tests do not look at pixels; a pixel check needs the software-GL run (tools/horde/bench.sh node <script>); re-take the same two pictures after the fix and view them.
