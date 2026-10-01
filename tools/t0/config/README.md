# tools/t0/config - the R1c headers / redirects generator (WP-T0-15)

`gen.mjs` is the config hook `build.py` runs for train R1c (after the page phase and the overlay, before `finalize`). It reads the built `dist` and writes
`_headers`, `_redirects`, `netlify.toml` (comments only) and `_ops/config-manifest.json`; nothing else (build.py fails otherwise). Deterministic.
The decisions behind the rules, with their evidence, are in `ops/header-decisions.md`; the list of deviations from chapter 02 is `ops/T0-DEVIATIONS.md`.

```
python tools/t0/build.py --train R1c                         # production config, legal text NOT included (opt-in)
python tools/t0/build.py --train R1c --with PG-legal         # the same plus the interim privacy/terms text (and with it the Street View sensor delegation)
T0_CONTEXT=staging python tools/t0/build.py --train R1c --out release/R1c-staging   # adds X-Robots-Tag: noindex, nofollow (gbg-staging, previews)
node tools/t0/config/emulate.mjs release/R1c/dist 8420       # Netlify-like server that applies the dist's own rules (see "Emulated rules" below)
node ops/headers-probe.mjs --dist release/R1c/dist           # 15 prod probes + 4 T0 extras against that server
node ops/headers-probe.mjs https://<site> --profile t0       # the same probes against any deployed site (read-only HEAD/GET)
node tests/t0/headers.spec.mjs                               # rule tests + probes + real-Chrome framing / CSP crawl (builds R1c --with PG-legal into tmp/<T0_AGENT>/R1c; T0_AGENT defaults to infra-config)
node tests/t0/headers.spec.mjs --online                      # also HDR-23: the Walkthrough's REAL Google Street View frame (two loads of www.google.com), 0 policy messages as built
node ops/staging-verify.mjs --train R1c --staging-url https://gbg-staging.netlify.app    # the staging checklist as a script (ops/STAGING-SETUP.md section 7)
```

## What it emits

| Path | Headers (one rule per header NAME per URL, proven by `lib.checkInvariant` before anything is written) |
|---|---|
| `/*` | `X-Content-Type-Options`, `Referrer-Policy` (never tighten: Mapbox/Google referrer restrictions), `Strict-Transport-Security` (unchanged), `X-Permitted-Cross-Domain-Policies`; `X-Robots-Tag` only with `T0_CONTEXT=staging` |
| every document, both spellings (`/x` and `/x.html`, `/` and `/index.html`) | `Cache-Control: no-cache, must-revalidate`, `X-Frame-Options: DENY`, enforced `Content-Security-Policy: frame-ancestors 'none'`, `Content-Security-Policy-Report-Only` (per-page origin list, NO report endpoint), `Permissions-Policy` (see below) |
| `/embed`, `/embed.html` | `Cache-Control`, `Content-Security-Policy: frame-ancestors *`, `Permissions-Policy` (all off); NO `X-Frame-Options`, NO Report-Only |
| `/assets/*`, `/data/*`, `/icons/*`, `/screenshots/*`, `/og/*`, other dirs, each root file | their cache class + `X-Frame-Options: DENY`. `/assets/*` is the ONLY immutable class; files that keep their name across releases (`screenshots`, `og`, `icons`) are never immutable and the generator refuses to run if they were (`FIXED_NAME_DIRS`) |

`Permissions-Policy`: `/ar` and `/ar.html` give camera, geolocation, accelerometer, gyroscope and magnetometer to `self` (the only page that uses them); `microphone` and `payment` are
`()` everywhere. `/` and `/index.html` host the Virtual Walkthrough's Google Street View frame: accelerometer and gyroscope are `(self "https://www.google.com")` ONLY when the
entry bundle carries the matching iframe `allow="accelerometer; gyroscope"` (patch `CP+walkthrough-sensors.json`) AND `privacy.html` discloses it (the opt-in `PG-legal` text);
otherwise they are `()` and `_ops/config-manifest.json` carries a warning. Every other page: everything `()`.

Netlify cannot unset an inherited header, so `X-Frame-Options`/CSP/Permissions-Policy are **enumerated**, never put in `/*`. The generator classifies
every file of the dist (a new HTML page, top-level directory or root file is picked up automatically; nested HTML is refused). Only unknown paths
(the 404 page for a URL nobody built) get just the `/*` set: a documented gap. `_redirects`: `friendly-lolly-da85c0.netlify.app` -> primary domain
`301!` (http and https), `/diagnostics` and `/unit-rendering-reference` `404!` in both spellings, the legacy scanner-path 404 rules (minus `/*.sql`,
`/*.bak`: `*` is only valid at the END of a redirect path).

Report-Only origin lists come from the page itself (absolute `src`/`href` of scripts, stylesheets, images, frames) plus fixed runtime needs:
Mapbox pages `api.mapbox.com` + `events.mapbox.com`; `/` also `frame-src` Google Street View + NPS; Watch Together `cdn.jsdelivr.net` + `0.peerjs.com`;
every page the Netlify RUM collector `ingesteer.services-prod.nsvcs.net`. No fonts are loaded anywhere, so none are listed.

## Emulated rules: what `emulate.mjs`, `serve.mjs` and `ops/headers-probe.mjs --dist` do and do not reproduce

The local servers prove that the GENERATED RULES say what we mean and that Chrome honours the resulting headers. They are not Netlify. Which of Netlify's documented rules each one models:

| Netlify behaviour | `tools/t0/config/emulate.mjs` (and `headers-probe --dist`, `prod-probe --dist`, `staging-verify --local`, `headers.spec.mjs`) | `tools/t0/serve.mjs` (the test harness server) |
|---|---|---|
| `_headers` rules matched on the path AS REQUESTED (`/x` and `/x.html` are different rules), `*` splat, `:placeholder`, case-insensitive | yes (`lib.matchPath`) | no: applies no `_headers` / `netlify.toml` header rules |
| empty header value does not unset an inherited header | yes (empty values ignored; verified on production for the legacy toml) | n/a |
| two rules setting the SAME header name (merge semantics UNDOCUMENTED) | not resolved silently: recorded in `emulator.conflicts`, response carries `X-Emulator-Conflict`; the generator proves it never happens | n/a |
| `_redirects` before `netlify.toml` `[[redirects]]`, first match wins, `!` force beats an existing file, status 404 rules serve `/404.html`, host-based rules (`Host` + `X-Forwarded-Proto`), query string kept on 301 | yes | no redirect rules at all |
| `netlify.toml`, `_headers`, `_redirects` are consumed at deploy time and never served (production: HP-13a, `verify-url`) | yes (since 2026-09-30; it used to serve `netlify.toml` as a file, so probe HP-13a failed locally) | no: serves every file of the dist including the three config files |
| pretty URLs (`/x` serves `x.html`), `404.html` with status 404 for unknown paths | yes | yes |
| default `Cache-Control: public, max-age=0, must-revalidate` when no rule sets one | yes | its own table (legacy-like: `/icons/*` immutable, `/data/*` and `/manifest.json` 3600, html no-cache), NOT the generated one |
| injected RUM snippet, pretty-URL rewriting of `<a href="/x.html">`, asset optimisation | **no** (HTML is served as uploaded; `verify-url --tree` and the T0-HTML probe accept both the raw file and the post-processing model) | no |
| edge cache, compression (brotli), HTTP/2, TLS, HSTS preload, CDN latency | **no** | no |
| header application to redirect responses | same rules as any response (Netlify's exact behaviour unverified) | n/a |
| trailing-slash and `/index.html` canonicalisation (train S1) | only `/x/` -> `/x` | no |
| `X-Robots-Tag` on a staging site | from the staging copy's `_headers` | no |

Consequences: a probe run against `serve.mjs` can never be fully green (no headers: HP-04, HP-05, HP-14 and the kill-copy checks fail), so the supported local path is `emulate.mjs`
(`node ops/headers-probe.mjs --dist <dist>`, `node tests/t0/prod-probe.mjs --base http://127.0.0.1:<port> ...`, `node ops/staging-verify.mjs --local ...`). A real deploy to
`gbg-staging` is the only proof of Netlify's own matching and merging; `ops/staging-verify.mjs` is the script to run there.

## Owner notes

* A repo-root `netlify.toml` (WP-T0-02) must contain NO header or redirect tables: Netlify does not document how they combine with `_headers`.
* Netlify does not support per-context headers in `netlify.toml`; the runbook's `[context.deploy-preview]` noindex is replaced by `T0_CONTEXT=staging`.
* Set the primary-domain option in the Netlify dashboard first (WP-T0-17); the host rule is the fallback.
* NOT verifiable here: Netlify's real matching/merge semantics (only documented in part), the injected RUM script, edge behaviour, header application to
  redirect responses. Verify on `gbg-staging` before production: `node ops/staging-verify.mjs --train R1c --staging-url https://gbg-staging.netlify.app`
  (it runs `ops/headers-probe.mjs --profile t0`, the probe, the byte proof and the noindex / no-config-file checks), then `curl -sI https://gbg-staging.netlify.app/embed` (no XFO) and
  the cross-origin framing page (`tests/t0/headers.spec.mjs` HDR-20 shows the shape).
