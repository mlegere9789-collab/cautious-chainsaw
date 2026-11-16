# To the owner of app/docs/TUTORIAL.md (and the tutorial PDF), from bt-renderer (crowd lane): one line about levels of detail is out of date

`app/docs/TUTORIAL.md`, in the list headed "**Figures:**" (about line 159), says:

> - Cross-fade between levels of detail is not done, so figures can pop at the hand-over distances.

That is no longer true. The crowd now cross-fades every swap between levels of detail (level 0 to 1, 1 to 2, the low mesh to the distant billboard, one billboard view to the next, the billboard to the flat dab), on WebGL2 and on WebGPU. Suggested replacement, in the tutorial's own register:

> - Figures change level of detail by a short fade over about 15 percent of the distance, not by a step, and the fade is the same whether you play to a moment or jump to it. The two renderings are mixed pixel by pixel, so on a moving camera a fading figure can show a fine crawl. It has been looked at in software rendering only; nobody has seen it on a real graphics card.

The sentence in the same list about "Material texture maps, body shape keys, flag pattern textures and hair alpha" stays as it is. The tutorial PDF is built from the Markdown; it needs the same change. Nothing else in the tutorial mentions this. Why: `app/docs/CROWD-NOTES.md` section "Cross-fade between levels of detail" says what is done and what is owed; `app/docs/BROWSER-VERIFICATION-LIST-CROWD.md` item 3 lists what a real GPU still has to show.
