# Fonts of the Dispatch language: files, sources, licences

Two typefaces, both under the **SIL Open Font License 1.1** (free to use, embed and redistribute with the page; the font files may not be sold on their own and keep their Reserved Font Names). Downloaded on 2026-10-07, one request at a time with 1.6 s between requests, a descriptive User-Agent, from the jsDelivr copy of the `@fontsource` npm packages (the Latin subset of each face, already compressed as WOFF2). jsDelivr has no `robots.txt` (its `/robots.txt` answers "Invalid URL"); the files are served with `Access-Control-Allow-Origin: *` for exactly this use.

| File | Face | Bytes | SHA-256 (first 16) | Source URL |
|---|---|---:|---|---|
| `Inter-400.woff2` | Inter Regular 400 | 23,692 | dd05e326cf8eac3b | https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.0/files/inter-latin-400-normal.woff2 |
| `Inter-500.woff2` | Inter Medium 500 | 24,368 | b0e7558f4710a1e2 | https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.0/files/inter-latin-500-normal.woff2 |
| `Inter-600.woff2` | Inter SemiBold 600 (unit codes and names, buttons, labels) | 24,304 | 62553d159189834a | https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.0/files/inter-latin-600-normal.woff2 |
| `Inter-700.woff2` | Inter Bold 700 (formation marks, counts, kickers) | 24,352 | aac638f7503cebb0 | https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.0/files/inter-latin-700-normal.woff2 |
| `SourceSerif4-400.woff2` | Source Serif 4 Regular | 20,044 | 5e7fda9cec061fce | https://cdn.jsdelivr.net/npm/@fontsource/source-serif-4@5.1.0/files/source-serif-4-latin-400-normal.woff2 |
| `SourceSerif4-400-italic.woff2` | Source Serif 4 Italic (place names, quotations) | 20,132 | b9ca45ecab30d277 | https://cdn.jsdelivr.net/npm/@fontsource/source-serif-4@5.1.0/files/source-serif-4-latin-400-italic.woff2 |
| `SourceSerif4-600.woff2` | Source Serif 4 SemiBold (card titles, the date line, the reading rail) | 21,484 | 2847f4d3b333168c | https://cdn.jsdelivr.net/npm/@fontsource/source-serif-4@5.1.0/files/source-serif-4-latin-600-normal.woff2 |
| `LICENSE-Inter.txt` | Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter) | 4,375 | 8c8fa881d9091ee3 | https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.0/LICENSE |
| `LICENSE-SourceSerif4.txt` | Copyright 2014-2021 Adobe Systems Incorporated, Reserved Font Name "Source" | 4,407 | e10247b156f9d26f | https://cdn.jsdelivr.net/npm/@fontsource/source-serif-4@5.1.0/LICENSE |

Total 158 KB as files, 211 KB as base64 inside the page. `studio/build.mjs` writes them into the page as `@font-face` rules with `data:` URIs, so the page requests no font; a test (`studio/test/build.test.mjs`) fails on any `url()` in the stylesheet that is not a `data:` URI.

What the Latin subset leaves out: the arrow U+2192 used by the cross-out card ("→") and some typographic marks fall back to the system font (Segoe UI Symbol, Arial); every letter, figure and punctuation mark the data uses is covered (`tools/measure-text.mjs` measures 99 characters of each mark font, the whole printable ASCII range plus the multiplication sign, the ellipsis and the middle dot).

Why these two. Inter is drawn for text on screens at 11 to 14 px (large x-height, open apertures, a hinted-looking rhythm at small sizes, tabular figures with `font-feature-settings: "tnum"`), which is where every mark of the map lives. Source Serif 4 is a transitional text serif with optical sizes designed for reading, the register of a newspaper's graphics desk; it carries only the words that are read (titles, the date line, the story in the rail, the place names). Nothing else ships.
