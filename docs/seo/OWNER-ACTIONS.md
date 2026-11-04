# What only the owner can do for search visibility and the field vitals

Nobody can guarantee a ranking or a position in Google. What can be done is: remove technical obstacles (the audit and the PG-zseo group do that), give Google content worth ranking, and tell Google the site exists. Google's own guidance says a sitemap "isn't required" and that ranking systems weigh many signals; Core Web Vitals are one of them, not the main one (https://developers.google.com/search/docs/appearance/core-web-vitals, https://developers.google.com/search/docs/fundamentals/seo-starter-guide, both read 2026-10-31).

Nothing in this list is done by Claude: each step needs an account, a click-through of terms, or a publication decision.

## 1. Deploy, then read the field data (the single most important step for the vitals)

1. Publish the R1f zip (drag and drop, your normal workflow). The Netlify RUM figures you pasted describe the old build (deploy 6abd6d62: 604 KB module preload and two render-blocking files in `<head>`, app stylesheet swapped in after React paints). R1e/R1f remove all of that. See section 0 of `SEO-AND-VITALS-AUDIT.md`.
2. Open Netlify -> Real User Monitoring for the site daily for a week (the 75th percentile is a 28-day window, so it improves slowly; the daily series moves first). Google's "good" targets at the 75th percentile are LCP 2.5 s, INP 200 ms, CLS 0.1 (https://web.dev/articles/vitals). If a metric stays Poor after a week, send me the screenshot and the route: the audit lists the next causes in order (A.3).
3. Keep the Netlify RUM script enabled; it is what measures this.

## 2. Google Search Console (free; needs your Google account)

1. Go to https://search.google.com/search-console and add the property. A verification file `google0dca4879c9657741.html` is already in the site, so a property for `https://gettysburginteractivemap.com/` (URL-prefix type) may already be verified under the account that created it; if you do not see it, add the property and use the HTML-file method (the file is already published).
2. Sitemaps -> add `https://gettysburginteractivemap.com/sitemap.xml` (20 URLs). Google reads the same URL from `robots.txt` anyway.
3. URL Inspection -> test the live URL of `/` and one sub-page, then "Request indexing" for the home page after the R1f deploy.
4. Check the reports weekly: Pages (why a URL is not indexed), Core Web Vitals (field data from Chrome users, the same 75th-percentile rule), Mobile usability, Performance (queries, clicks, positions). Core Web Vitals in Search Console needs enough traffic before it shows data.
5. After deploy, run https://search.google.com/test/rich-results on `/` and `/documentary.html` to confirm the new structured data parses (audit item E6).

## 3. Bing Webmaster Tools (free; needs a Microsoft account)

1. https://www.bing.com/webmasters -> add the site (import from Search Console is offered), verify, submit the same sitemap. Bing results also feed DuckDuckGo and other engines.

## 4. Decisions only you can take (each is listed in the audit with the exact patch)

| Decision | Why it is yours | Where |
|---|---|---|
| Home page `<title>`: keep the brand-only "Gettysburg Animated Battlefield Map" or use "Gettysburg Interactive Battle Map - Animated Map of July 1-3, 1863" | brand wording; changes an identity field | `tools/t0/seo/optional/PG-zseo-opt.json`, id `ZSEO-OPT-home-title` |
| Your name in the home page structured data (`author: Person "Mike Legere"`, already in production) | personal data on a public page; Google's policy forbids misrepresenting ownership, so it must be what you want stated | `index.html` JSON-LD |
| Static, crawlable pages built from the site's own data (per day, per turning point and key moment, per landmark, per regiment) | scope and evidence rules: content marked `unreviewed` or `provisional` must keep its tier mark; monument text needs sources that meet the rules, and `data/monuments.json` currently cites Wikipedia/NPS-derived listings | audit F8 |
| `Dataset` markup for the order of battle | needs a stated creator and licence | audit F9 |
| Whether to self-host the Mapbox CSS used by the eight map pages | Mapbox terms | audit F2 |

## 5. Legitimate ways to earn links (links from real sites are a ranking input; do not buy them, do not trade them in bulk, do not use link networks)

- Offer the site as a resource to: Gettysburg-area and Civil War history teachers and school districts (the Students page), local and state historical societies, Civil War round tables, library research guides, genealogy societies and ancestry forums (the Find Your Ancestor page), and Civil War bloggers or podcasts. A short, personal message with one specific page, not a mass mailing.
- Ask the Gettysburg Foundation, the park's friends groups, Visit Gettysburg or local tourism pages whether they list independent educational resources. They decide; some will say no.
- Publish short posts on your own channels that link a specific moment of the map (a `/?tick=` deep link) on the anniversaries of July 1-3.
- Cite the map from any article or paper you write, with the URL.
- Be accurate: a site that historians trust is the one that gets cited. The tier marking you already keep is an advantage here.

## 6. What not to do

Buying links, cloaked or hidden text, copying text from other sites, fake reviews or ratings in structured data, doorway pages, or adding "SEO" keyword lists to pages. Google's policies treat these as spam and they can remove a site from results.
