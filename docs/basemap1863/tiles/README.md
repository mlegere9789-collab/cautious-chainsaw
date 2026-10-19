# Tiles of the 1863 reconstruction

**Reconstruction of Gettysburg, July 1863.** No aerial photograph of 1863 exists: these tiles are a modern public-domain aerial photograph (USDA NAIP, 4 June 2013, 1 m) with post-1863 features removed and 1863 features added from period maps and records. Not an exact replica; see `../BUILD.md` (measured accuracy, what is unknown, licences) and `../PROVENANCE-LAYER/` (what was changed, pixel by pixel, with sources).

- `{z}/{x}/{y}.webp`: 512 x 512 px lossy WebP, Web Mercator, zoom 11 to 17 (z11 to z15 whole data box, z16 the Warren-sheet coverage plus 500 m, z17 around ten hotspots). The photograph is 1 m per pixel, so z16 is native; z17 is an enlargement.
- Scheme: the Mapbox GL / Studio-backdrop convention: the world is 512 px at zoom 0, tile (z, x, y) is the standard slippy-map index, `tileSize: 512`, so the tile zoom equals the camera zoom. A consumer of 256 px tiles reads zoom z+1 and the four child indices.
- `manifest.json`: bounds, zoom ranges, attribution text, sha256 and size of every tile, hashes of the inputs.

Use in a map (any renderer that takes XYZ raster tiles):

```js
{ type: 'raster', tiles: ['tiles/{z}/{x}/{y}.webp'], tileSize: 512, minzoom: 11, maxzoom: 17,
  bounds: [-77.34375, 39.75788, -77.146, 39.87602],
  attribution: 'Reconstruction of Gettysburg, July 1863 (USDA NAIP 2013 with period maps; see BUILD.md)' }
```

Always show a label that this is a reconstruction. Overzoom beyond 17 only enlarges the same pixels.
