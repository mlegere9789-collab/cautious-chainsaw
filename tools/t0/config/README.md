# tools/t0/config - the R1c headers / redirects generator (WP-T0-15)

`gen.mjs` is the config hook `build.py` runs for train R1c (after the page phase and the overlay, before `finalize`). It reads the built `dist` and writes
`_headers`, `_redirects`, `netlify.toml` (comments only) and `_ops/config-manifest.json`; nothing else (build.py fails otherwise). Deterministic.

```
python tools/t0/build.py --train R1c                         # production config
T0_CONTEXT=staging python tools/t0/build.py --train R1c --out release/R1c-staging   # adds X-Robots-Tag: noindex, nofollow (gbg-staging, previews)
node tools/t0/config/emulate.mjs release/R1c/dist 8420       # Netlify-like server that applies the dist's own rules
node ops/headers-probe.mjs --dist release/R1c/dist           # 15 prod probes + 4 T0 extras against that server
node ops/headers-probe.mjs https://<site> --profile t0       # the same probes against any deployed site (read-only HEAD/GET)
node tests/t0/headers.spec.mjs                               # rule tests + probes + real-Chrome framing / CSP crawl (builds R1c into tmp/infra-config)
```

## What it emits

| Path | Headers (one rule per header NAME per URL, proven by `lib.checkInvariant` before anything is written) |
|---|---|
| `/*` | `X-Content-Type-Options`, `Referrer-Policy` (never tighten: Mapbox/Google referrer restrictions), `Strict-Transport-Security` (unchanged), `X-Permitted-Cross-Domain-Policies`; `X-Robots-Tag` only with `T0_CONTEXT=staging` |
| every document, both spellings (`/x` and `/x.html`, `/` and `/index.html`) | `Cache-Control: no-cache, must-revalidate`, `X-Frame-Options: DENY`, enforced `Content-Security-Policy: frame-ancestors 'none'`, `Content-Security-Policy-Report-Only` (per-page origin list, NO report endpoint), `Permissions-Policy` (camera/geolocation/sensors `(self)` only on `/ar`) |
| `/embed`, `/embed.html` | `Cache-Control`, `Content-Security-Policy: frame-ancestors *`, `Permissions-Policy`; NO `X-Frame-Options`, NO Report-Only |
| `/assets/*`, `/data/*`, `/icons/*`, other dirs, each root file | their cache class (unchanged from the legacy toml, except `/icons/*` = 1 day, no `immutable`) + `X-Frame-Options: DENY` |

Netlify cannot unset an inherited header, so `X-Frame-Options`/CSP/Permissions-Policy are **enumerated**, never put in `/*`. The generator classifies
every file of the dist (a new HTML page, top-level directory or root file is picked up automatically; nested HTML is refused). Only unknown paths
(the 404 page for a URL nobody built) get just the `/*` set: a documented gap. `_redirects`: `friendly-lolly-da85c0.netlify.app` -> primary domain
`301!` (http and https), `/diagnostics` and `/unit-rendering-reference` `404!` in both spellings, the legacy scanner-path 404 rules (minus `/*.sql`,
`/*.bak`: `*` is only valid at the END of a redirect path).

Report-Only origin lists come from the page itself (absolute `src`/`href` of scripts, stylesheets, images, frames) plus fixed runtime needs:
Mapbox pages `api.mapbox.com` + `events.mapbox.com`; `/` also `frame-src` Google Street View + NPS; Watch Together `cdn.jsdelivr.net` + `0.peerjs.com`;
every page the Netlify RUM collector `ingesteer.services-prod.nsvcs.net`. No fonts are loaded anywhere, so none are listed.

## Owner notes

* A repo-root `netlify.toml` (WP-T0-02) must contain NO header or redirect tables: Netlify does not document how they combine with `_headers`.
* Netlify does not support per-context headers in `netlify.toml`; the runbook's `[context.deploy-preview]` noindex is replaced by `T0_CONTEXT=staging`.
* Set the primary-domain option in the Netlify dashboard first (WP-T0-17); the host rule is the fallback.
* NOT verifiable here: Netlify's real matching/merge semantics (only documented in part), the injected RUM script, edge behaviour, header application to
  redirect responses. Verify on `gbg-staging` before production: `node ops/headers-probe.mjs https://gbg-staging.netlify.app --staging --profile t0`,
  `curl -sI https://gbg-staging.netlify.app/embed` (no XFO), and the cross-origin framing page (`tests/t0/headers.spec.mjs` HDR-20 shows the shape).
