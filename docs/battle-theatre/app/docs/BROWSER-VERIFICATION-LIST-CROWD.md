# BROWSER-VERIFICATION-LIST: the figure pass (src/crowd). Nothing below has been measured or seen on a real GPU.
1. Frame time with all 127,572 figures on the real layer, WebGPU and WebGL2, 1080p and 4K, Arc iGPU and a discrete GPU: overview, ridge, line at 20 m, battery, cavalry; compare with the paper model in CROWD-NOTES.md (p95 <= 20 ms, gate G1). Mobile: a phone-class GPU and a 4x throttled CPU: LOD0 budget, radii, `clipAt` cost.
2. WebGPU path: only compiled and run on SwiftShader (no validation error, 23 draws, 433 LOD2 figures); headless captures of the WebGPU canvas are blank here (also for the prototype), so its picture has not been seen. Compare it pixel for pixel with the WebGL2 picture at the same time.
3. LOD hand-over screenshots at 10, 13 and 75 m (G4): pops without the cross-fade and hysteresis that are not implemented; the impostor colour step beyond 40 m (figures3d handover.json).
4. Faces, hands, hats, accoutrements and arms at 2, 5, 10 m: skinning of coat and trousers against the clips (G6), flag staff and colours, the gap-coloured items, hair cards (stochastic coverage only), the body shape keys (not applied).
5. Terrain: marching men on Culp's Hill and Little Round Top (feet on the ground at LOD0; LOD1/2 have no foot planting).
6. Night: dark coats under the luminance floor (Q10) with the effects layer on and off.
7. Scrub purity in pixels at LOD0 / 1 / 2 (same time, same picture), at 60x playback (legs run at the playback rate).
8. The train and the works lists at 3 Jul 13:00 to 15:00 and on the nights of 1 and 2 July: gun models, teams, drivers, the works mesh and crews.
9. Entry time: the instance table builds in about 12 s (first visit), clip bake about 5 to 9 s, class meshes about 5 s on this machine; decide whether a precomputed table (content-hash cache) is wanted.
