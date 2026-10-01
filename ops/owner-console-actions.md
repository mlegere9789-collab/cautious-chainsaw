# Owner console actions: the Top-12 checklist (deadline 2026-10-07)

For the site owner. This is the register's "Top 12 owner actions in the next 7 days" (`docs/plan/FINAL/01-decision-register.md` section 2) merged with work package WP-T0-17 (`docs/plan/FINAL/02-tranche0-hotfix-runbook.md`), rewritten as a checklist with click paths. Nothing here can be done by the AI: they are your accounts, your money and your identity. Estimated owner time: about 7 hours in all (the register's minutes add to 435; WP-T0-17 estimates 4 to 6 hours for the console part).

**How to use it.** Do the items in the order of the day plan below; tick the boxes; put the screenshots the items ask for in one folder (the plan calls it `docs/baseline-2026-09-30/`; create it if it is not there; if you would rather keep screenshots out of git, use any folder outside the repo and tell the AI where). **Never paste a token, key, password, recovery code or one-time code into a file in this repository or into a chat.** Screenshots are fine if the secret part is hidden (Mapbox shows only the start of a token in its list).

**About the click paths.** Written on 2026-09-30 from the providers' public documentation and the plan's findings; **none of them was clicked through by the author** (no access to your accounts). Web consoles rename menus often. Where a label is not what you see, use the console's own search box and the linked documentation page; the intent of each step is stated so you can adapt. The pages read: Mapbox "Access tokens" (docs.mapbox.com/accounts/guides/tokens), Google Cloud "API keys" (docs.cloud.google.com/docs/authentication/api-keys), Netlify "Real User Monitoring", "Credit-based pricing plans / How credits work / Monitor usage", "Manage DNS records", "Manage deploys" (docs.netlify.com), Bing "Add and Verify site" (bing.com/webmasters/help).

## Day plan

| Day | Items | Why this order |
|---|---|---|
| Day 1 (Wed 2026-09-30 or Thu 10-01) | 5 (Netlify plan and credits), 12b (RUM block), 1 (archive check) | nothing ships before credits are known; the RUM block must exist before any Lighthouse run |
| Day 2 | 12a (real-mouse test), 3 (Mapbox), 4 (Google key) | 12a decides what the plan does first if real input is broken |
| Day 3 | 2 (Search Console and Bing), 6 (accounts, domain, TLS) | the 28-day Search Console clock gates the SEO train S1; account security is the biggest realistic risk |
| Day 4-6 | 7, 8, 9, 10, 11 (decisions and outreach) | they are decisions and e-mails, not console work; defaults apply if you do not answer (section at the end) |
| By 2026-10-07 | everything ticked, screenshots filed | decision gate DG-0 |

Do NOT this week (register): change any URL form, name or title tag; delete stale Netlify deploys before the archive exists; make an OG image from a screenshot; start rebuild code.

---

## Action 5: Netlify plan and credits (15 min)  [ ]

**Why now:** a production deploy costs 15 credits; on the Free plan 300 credits a month is a hard limit and when it is exhausted **all** your projects are paused ("Site not available"). Nobody knows your plan (`unverified`).

1. Open <https://app.netlify.com> and log in. Use the team switcher (top left) to pick the team that owns the production site.
2. Open the team's **Usage & billing** page (the documentation: "From your Netlify team dashboard, go to Usage & billing > Credit balance").
3. Write down (in your notes or the first row of `ops/RELEASE-LOG.md` notes): the **plan name**, the **credit balance** and the monthly allotment, and the **credit usage breakdown** (how many credits production deploys used this month).
4. Screenshot the credit balance and the breakdown.
5. Notifications: the documentation says Netlify e-mails you and shows an in-app notice at **50, 75, 90 and 100 percent** of the month's credits. Check that the e-mail address on the account is one you read. (The plan asked for an alert at 70 percent; the 75 percent notice is the nearest built-in one. Whether it is configurable is unverified.)
6. Open the production site > **Deploys**: count this month's production deploys, and write down the id and date of the deploy that is currently published (it is the rollback target for R0).
7. **Primary domain:** production site > **Domain management** (or **Site configuration > Domain management**): confirm `gettysburginteractivemap.com` is the **primary domain**. (Needed before R1c's rule that redirects the `netlify.app` address to it: chapter 02 WP-T0-15. Label unverified.)
8. From now until R0 ships: **no ad-hoc redeploys.**

Done when: plan, balance and the current deploy id are written down, screenshots filed.

---

## Action 12b: block Netlify RUM in your own test profile (10 min)  [ ]

**Why:** your own audits pollute the real-user numbers (`ops/RUM-hygiene.md` has the reasoning and a log). Do this **before any Lighthouse or DevTools session on the live site**.

1. In Chrome: click your profile picture (top right) > **Add** to create a profile just for testing the live site (name it `GBG test`).
2. Create a desktop shortcut for that profile with this target (Right-click desktop > New > Shortcut):
   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --user-data-dir="C:\Users\mlege\gbg-test-profile" --host-resolver-rules="MAP ingesteer.services-prod.nsvcs.net ~NOTFOUND" https://gettysburginteractivemap.com/
   ```
   (This makes the RUM collector's address unreachable for that browser. Measured to work with the same flag on a different host; the real collector's address was read from the RUM script's code.)
3. Start the browser from that shortcut, press `F12` > **Network** tab > reload the page. Type `rum` in the Network filter box. You must see **no successful POST** to `ingesteer.services-prod.nsvcs.net` (it shows as failed, `net::ERR_NAME_NOT_RESOLVED`).
4. Second block while DevTools is open: `Ctrl+Shift+P` > type `Show Network request blocking` > Enter > tick **Enable network request blocking** > click **+** > enter `*/.netlify/scripts/rum*`.
5. For online speed tests (PageSpeed Insights, WebPageTest, GTmetrix): do not run them against the live address at all; they cannot be blocked.
6. Every time you open the live site outside that profile, write a line in the own-testing log at the bottom of `ops/RUM-hygiene.md`.

Done when: the Network tab shows the block working (screenshot of the failed request).

---

## Action 1: archive every zip and contain the secrets (60 min; part done)  [ ]

**State on 2026-09-30 (measured):** a local archive folder `C:\Users\mlege\gettysburg-archive\zips` already holds **127 zip files (193 MB)** and `ops/ARCHIVE_MANIFEST.tsv` has **127 rows** (name, modified time, size, sha256). What the register asks for that is **not** verified as done: a copy **outside this machine** (external disk plus one encrypted cloud copy), a secrets scan, and containing the four `.env.local` folders.

1. **Second copy:** copy the whole `gettysburg-archive` folder to an external drive, and one encrypted archive (for example a password-protected 7-Zip/zip, or an encrypted cloud vault) to a cloud store you control. Keep the password in your password manager.
2. **Do not delete the originals in Downloads yet.** (The register: nothing is deleted before the archive exists and the plan says so.)
3. **The zips that define the site.** **Live is no longer the 2026-09-09 deploy:** production now serves a later deploy, id `6abd6d62...` (`6abd6d6248919c2f4d7b7c02` when measured 2026-09-30), which changed `index.html` and `data/terrain.json` and exists in none of the 127 archived zips (`docs/baseline-drift.md`). **Download it now** (Netlify > the site > Deploys > the deploy whose id starts `6abd6d62` > Download deploy; if a newer deploy is live, download that one and note its id), file it in `C:/Users/mlege/gettysburg-archive/zips` and add its row to `ops/ARCHIVE_MANIFEST.tsv` (ask the AI). The byte comparison with the reconstructed baseline: unzip it and run `node ops/sha-list.mjs list <unzipped folder> --out tmp/live-deploy.tsv` then `node ops/sha-list.mjs list baseline/dist --out tmp/baseline.tsv` and `node ops/sha-list.mjs compare tmp/live-deploy.tsv tmp/baseline.tsv`: identical, or only the two known files differing, is the expected result; `netlify.toml` is the one file nobody has compared yet. The older pair: the Netlify "source" zip `6aa16d6080cc621d7501ebde-d9edb0ae93d265ba.zip` (sha256 `7ba2083492899b4cb3e0a91949ca475f5c73e4443b1ce9463e1ac511d4da077b` in the manifest) and the downloaded "deploy" zip `deploy-6aa16d6180cc621d7501ebe0.zip`. Never redeploy a downloaded deploy zip.
4. **`.env.local` folders:** four old source folders in Downloads hold an `.env.local` with the **revoked** Mapbox token #1. Keep those folders **outside** the repository; never `git add` them. To scan before anything else enters git: install gitleaks (<https://github.com/gitleaks/gitleaks>, your choice), then `gitleaks detect --no-git --source <folder>` on each folder; expect findings only in the `.env.local` files.
5. **Live md5 check (the AI/agent can do it; you can too):** `curl -s https://gettysburginteractivemap.com/assets/index-Cg8FAMXN.js | md5sum` must print `7ef75b95f4c02700430b8aa91e3a7459` (Git Bash; measured on 2026-09-30: it printed exactly that, and `ops/sha-list.mjs verify-url` found the entry file identical to `legacy/dist`).
   **The whole-site check (AI or you, read-only, about 6 seconds):** `python tools/t0/baseline.py verify-live` must print `IDENTICAL`; it compares every file (HTML through the model of Netlify's post-processing) with `baseline/dist` and is required before every deploy (`ops/RELEASE-RUNBOOK.md` rule 11).

Done when: an off-machine copy exists, the manifest matches the copy, the secrets scan is done, the `.env.local` folders are outside the repo.

---

## Action 12a: headed real-mouse test on the live site (20 min)  [ ]

**Why:** automated browsers say **0 mouse and wheel events reach the map** on the current site (a full-size canvas above the map has `pointer-events:auto`). That has been measured only in headless Chrome. If a **real** mouse on the live site cannot drag or zoom the map, it outranks everything else in the plan; if it can, the mobile shell (C1) stays first. Nobody has looked yet.

Do it in the **test profile of action 12b** (RUM blocked) on a normal desktop screen with a **real mouse** (not a touchpad gesture, not remote desktop):

1. Open the shortcut, wait for the page. The current site shows an intro and then a "Choose Your Experience" box: pick **Desktop**.
2. Wait until the map shows (blank tiles are not the test: the test is whether the map **moves**).
3. **Drag:** press and hold the left button on an empty part of the map, move 200 pixels, release. Did the map pan? (yes/no)
4. **Wheel:** put the pointer over the map and roll the wheel forward 3 notches. Did the map zoom in? (yes/no)
5. **Click:** click on a unit marker. Did a unit panel open? (yes/no)
6. **Keys:** press `?`. Did Help open? (yes/no)
7. Screen-record or screenshot each result (Windows: `Win+Shift+S` for a screenshot; `Win+G` Game Bar for a recording), and write down the Chrome version (`chrome://version`).
8. Send the results to the AI in one message. Rule: **drag or wheel = no** means input fix first; **both = yes** means the plan's order stands.

The same steps are in `tests/t0/journeys-manual.md` part B with a results table; repeat them on the R0 site after R0 ships (R1a's gate).

Done when: four yes/no answers and the evidence are with the AI.

---

## Action 3: Mapbox token review and dev/preview tokens (30 min)  [ ]

**Why:** tile requests answer 403 unless the request's Referer is your domain; a wrong allow-list means either a blank map for everyone or a token usable from anywhere. Never add `netlify.app` to the production token's list.

1. Open <https://console.mapbox.com/account/access-tokens/> (Mapbox's documentation gives this address for the Access tokens page) and sign in.
2. Find the token the site uses. It is a **public token** (starts `pk.`). To identify it: open the live page's source (`Ctrl+U`), search for `pk.`, compare the first characters with the token list (the list shows only the beginning of each token). Do not copy the whole token anywhere.
3. **Before changing anything**, screenshot the token's page: name, scopes, URL restrictions, created date.
4. Open the token (click its name, or its menu > Edit). Check:
   * **URL restrictions** contains exactly `gettysburginteractivemap.com` (subdomains such as `www.` are covered automatically, per Mapbox's documentation; wildcards are not supported; up to 100 entries). **Remove** anything else, especially any `netlify.app` entry and any `localhost`.
   * **Scopes** are the public read scopes the map needs: `styles:tiles`, `styles:read`, `fonts:read`. The audit recommends dropping `datasets:read` and anything else beyond those (change it only if the list offers it and after the screenshot; if the map goes blank, put it back).
5. **Create the dev token:** on the Access tokens page click **Create a token**. Name `gbg-dev`. Tick only the same public scopes. URL restrictions: `localhost`. Create. (Used only for local development builds; never in production files.)
6. **Create the preview token:** name `gbg-preview`, the same minimal scopes, URL restriction `netlify.app`. **Treat it as low value:** `netlify.app` authorises every Netlify site, so give it the minimum scopes, never put it in production files, and rotate it monthly. (Chapter 02's release proofs do not use it: `ops/STAGING-SETUP.md` section 9.)
7. Record a token inventory in your password manager: name, scopes, URL list, created date. **Not** the token values.
8. **Usage alerts and cap:** in your Mapbox account look for the **Billing** and **Statistics** pages; enable usage or billing notification e-mails if the console offers them (the documentation page read does not describe them: unverified) and note whether a **spending cap** exists (Mapbox does not document a hard cap). Put a monthly reminder in your calendar to look at map-load statistics. Expect to be far below the free tier (an upper bound of about 3.4 thousand map loads a month against 50 thousand free).
9. **Check the site still works** (a blank map means a mistake): open the live site in your test profile.

Done when: screenshots of the token before and after, an inventory line for each of three tokens, and the alert/cap answer.

---

## Action 4: Google Cloud key restriction (20 min)  [ ]

**Why:** a Google Maps Embed key (the one starting `AIzaSyC-1e...`) is visible in the page code (used for Street View). Nobody can see from outside whether it is restricted. It is free to use but an unrestricted key could later be enabled for paid APIs by mistake.

1. Open <https://console.cloud.google.com/> and select the project that owns the key (project selector at the top).
2. Menu (three lines, top left) > **APIs & Services** > **Credentials**. Under **API keys**, click the key's name (match its first characters with the page source: search `AIzaSy`).
3. Screenshot the key's current restrictions **before** editing.
4. **Application restrictions:** choose **Websites** (HTTP referrers) > **Add** and enter both `https://gettysburginteractivemap.com/*` and `https://www.gettysburginteractivemap.com/*`. (Google's documentation: `example.com/*` style patterns; add both apex and `www`; a wildcard cannot sit in the middle of a URL.)
5. **API restrictions:** choose **Restrict key** > tick **Maps Embed API** only > **OK**.
6. **Save**. (Changes can take a few minutes to apply.)
7. **Enabled APIs:** menu > **APIs & Services** > **Enabled APIs & services**: screenshot the list.
8. **Budget alert:** menu > **Billing** > **Budgets & alerts** > **Create budget**: amount **USD 1**, alerts at 50, 90 and 100 percent, e-mail to you.
9. Open the live site's Street View (Virtual Walkthrough) once in your test profile to check it still loads.
10. **Do not rotate the key now:** it is compiled into the site's bundle, so changing it needs a code change and a release train; restriction is the fix for Tranche 0.

Done when: screenshots of the restriction (referrers, API list), enabled APIs and the budget.

---

## Action 2: Search Console and Bing verification by DNS (45 min)  [ ]

**Why:** the domain has no verified Search Console property (the earlier one lapsed) and no baseline data. A 28-day clock starts when you verify and it gates the SEO train S1, so verify early. Your DNS is hosted by Netlify (the nameservers are Netlify's), so records are added in Netlify.

**A. Google Search Console (TXT record)**
1. Open <https://search.google.com/search-console> and sign in with the Google account you want to own it (use one with 2-step verification: action 6).
2. **Add property** > choose the **Domain** card > enter `gettysburginteractivemap.com` > Continue. Copy the **TXT record** value it shows (`google-site-verification=...`). Leave the window open.
3. New tab: Netlify web app > **Domains** (team level) > click `gettysburginteractivemap.com` > **DNS records** > **Add new record** (Netlify's documentation: "select Add new record, choose the record type from the dropdown, fill in the fields, Save").
4. Type **TXT**; Name: `@` (the bare domain; leave the field as the apex if it offers a blank); Value: paste; Save. (Netlify's TXT limit is 255 characters per value: the verification string fits.)
5. Back in Search Console click **Verify**. If it fails, wait 10 minutes and retry (DNS changes usually take minutes, sometimes hours; Netlify says up to 48 hours).
6. When verified: **Performance** > export the full available range (top right Export) and screenshot **Pages/Indexing**; put them in the baseline folder. This starts the 28-day baseline.
7. The 52-byte file `google0dca4879c9657741.html` from your Downloads is a second, older verification method: the AI adds it to the site in R1a (WP-T0-14); the DNS record above is the primary method.

**B. Bing Webmaster Tools**
1. Open <https://www.bing.com/webmasters> and sign in.
2. Easiest: choose **Import from Google Search Console**, sign in with the Google account of step A, tick the property, Import: Bing adds the site and verifies it automatically (Bing's documentation).
3. Alternative (manual): **Add a site** > enter the address > choose **CNAME** verification. Bing shows a **name** (a random-looking host) to point at `verify.bing.com`. In Netlify DNS records: **Add new record** > type **CNAME** > Name: the value Bing shows > Value: `verify.bing.com` > Save; then click **Verify** in Bing (can take up to 72 hours).
4. Note: the plan says "DNS TXT for both"; Bing's documented methods are XML file, meta tag and CNAME (plus the import and Domain Connect), so use CNAME or the import for Bing.

Done when: both properties show as verified, exports and screenshots filed, the verification date written in your notes (day 0 of the 28).

---

## Action 6: accounts, recovery, domain renewal, TLS (60 min)  [ ]

**Why:** the plan's biggest realistic risk is account takeover, not a web exploit: the public contact Gmail is very likely the recovery address of every account.

**Two-factor / passkeys** (do the mailbox first, the others after): tick each when done and printed recovery codes are stored **offline**.
* [ ] **Google account (the mailbox and Google Cloud):** <https://myaccount.google.com/security> > **2-Step Verification** and **Passkeys**; then **Recovery email/phone**: set a recovery e-mail that is **not** the public contact address.
* [ ] **Netlify:** avatar (bottom left) > **User settings** > **Security** > two-factor authentication (menu names as I know them; use Netlify's docs page "two-factor authentication" if different). Also review **Applications > Personal access tokens** and delete any you do not use.
* [ ] **Mapbox:** account settings > **Security**: enable two-factor authentication.
* [ ] **Name.com (registrar):** account > **Security**: enable two-factor authentication; keep the domain's transfer lock on.
* [ ] **GitHub** (when you make the private repo): Settings > **Password and authentication** > two-factor authentication and passkeys.
* [ ] Recovery e-mails on Netlify, Mapbox, Name.com, GitHub: change each away from the public contact Gmail if the service allows.
* [ ] **Name a delegate** (someone who can act if you cannot) and write where the recovery codes are.

**Domain renewal** (registered 2026-06-13, **expires 2027-06-13**):
1. Log in at Name.com > **My Domains** > `gettysburginteractivemap.com`.
2. Turn **Auto-renew** on, confirm the payment card is valid, and renew for several years in one go (the register says multi-year; 3 to 5 years is the audit's suggestion). Keep WHOIS privacy on and the transfer lock on.
3. Screenshot the domain's details page.

**TLS certificate (the plan states it expires 2026-11-10; unverified):** Netlify web app > production site > **Domain management** > **HTTPS**. Screenshot the certificate and its expiry. Netlify renews certificates automatically when DNS points at it; put **2026-10-25** in your calendar to look again and confirm a renewed date (the plan wants renewal confirmed by then). If it did not renew, use the page's **Renew certificate** control and tell the AI.

Done when: every box above is ticked, the mailbox recovery address is separate, and the renewal and TLS screenshots are filed.

---

## Actions 7 to 11: decisions and outreach (no console)

| # | What to do | Where the answer goes | If you do nothing |
|---|---|---|---|
| 7 | **State capacity:** hours per week (the plan assumes 24 for Tranche 0; the whole plan is 729-1,236 person-days, so dates depend on this), the target dates for the A-line and A+, and confirm the Tier 1/2/3 list and the Labs defaults (Labs pages: keep or retire) | tell the AI in writing; it goes into the plan's decision ledger (register section 10) | the register defaults apply at DG-0 (2026-10-07): 24 h/week, slip allowed, Tier defaults |
| 8 | **Name a historical reviewer and a second reader**, and **send the three drafted, unsent permission e-mails** (NPS CWSS status; Gettysburg NMP Research Center; ACHS/Musselman). The plan says the drafts exist; their location is not recorded in this repository (check your mail drafts, or ask the AI to regenerate them). Nothing has been sent. `docs/editorial/reviewer-charter.md` is the draft reviewer standard. | your mail; tell the AI who the reviewer is | historical times ship labelled "unreviewed"; roster work (P5) waits on the NPS reply |
| 9 | **Four quick calls:** sound (default: remove); dead `H` heatmap (default: delete); "What They Could See" (default: rename High Ground, later train); Labs list AR / Watch Together / Cinematic Export / Sandbox (default: retire). Tranche 0's defaults already chosen: sound removed, heatmap deleted, AR hidden with noindex, Watch Together security fix only, Immersive pause fix only | tell the AI only if you want a different answer, **before R1a is built** | the defaults ship in R1a |
| 10 | **Rights questions:** (a) four data notes cite a "Gettysburg Animated YouTube vignette" (for example `terrain.json:38`, `chronology_day1.json:31`): did any positions or texts come from the paid app or that channel? (b) Busey and Martin as facts-only with attribution? (c) is "not affiliated with the NPS or ABT" true? (d) any registered mark on the name? | tell the AI; it feeds licence, legal and name decisions | licence and terms text stays provisional |
| 11 | **Approve the name** "Gettysburg Interactive Map" (executed in the SEO train S2, not in Tranche 0) and the contact plan (role addresses; the personal Gmail stays private) | tell the AI | S2 waits; nothing in Tranche 0 changes the name |

Also (chapter 02 O-T0 decisions; the defaults are already in force and were chosen so the work can proceed): O-T0-3 accept the "played-through state" clock rule (this also accepts that after R0 tick 1 shows 71 units instead of the intro's accidental extra ghost units); O-T0-4 deploy path CLI (`ops/RELEASE-RUNBOOK.md`); O-T0-9 who runs the iPhone SE / Android / Samsung checks and when (by 2026-10-24, before R1b). Tell the AI in writing to change any of them.

---

## Final tick-list (by 2026-10-07)

- [ ] 5 Netlify plan, balance, current deploy id, primary domain
- [ ] 12b test profile with the RUM block, verified in the Network tab
- [ ] 1 second archive copy, secrets scan, `.env.local` folders outside the repo
- [ ] 12a headed real-mouse results sent
- [ ] 3 Mapbox: allow-list reviewed, dev and preview tokens made, alert/cap answered
- [ ] 4 Google key restricted, budget alert set
- [ ] 2 Search Console and Bing verified, baseline exports saved
- [ ] 6 2FA and recovery, domain auto-renew and multi-year, TLS looked at (and 2026-10-25 reminder set)
- [ ] 7 to 11 answered or defaults accepted
- [ ] Screenshots filed; nothing secret was written down in the repository
