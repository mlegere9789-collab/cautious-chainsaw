# Contact architecture (role addresses, mail DNS, DMARC ladder) - DRAFT, DO NOT ACT

**Status: DRAFT written 2026-09-30 for WP-DEC-06 / register D-CONTACT. Nothing in this file has been done. No DNS record, account, forwarder, mailbox, form or site file was created or changed.** Every step below is an owner action or a later work package; where this document says "add", read "the owner adds, after deciding". Not legal advice.

## 1. What exists today (verified 2026-09-30, read-only)

| Fact | How it was checked |
|---|---|
| The only public contact is `gettysburginteractivemap@gmail.com`: `privacy.html:47`, `terms.html:42`, `site-nav.js:194` ("Contact" in the footer), the timeline credit "Created by: Mike Legere" with the mailto (`legacy/analysis/bundle.pretty.js:112361-112365`; a name-only credit at 101585) | `grep -rn gmail legacy/dist legacy/analysis/bundle.pretty.js` |
| DNS is Netlify DNS: NS `dns1-4.p09.nsone.net`; A `98.84.224.111`, `18.208.88.157`; **no MX, no TXT (no SPF, no verification records), no CAA, no `_dmarc`** | DNS-over-HTTPS queries to `cloudflare-dns.com/dns-query` for MX, TXT, CAA, `_dmarc` TXT, NS, A (Status 0/empty for MX, TXT, CAA; Status 3 NXDOMAIN for `_dmarc`) |
| Netlify DNS supports MX, TXT (255-character limit per string), CAA and CNAME records | `https://docs.netlify.com/manage/domains/configure-domains/dns-records.md` |
| `/.well-known/security.txt` does not exist | `curl -I https://gettysburginteractivemap.com/.well-known/security.txt` -> 404 |
| The same Gmail address is probably the recovery identity of Netlify, Mapbox, Google Cloud, Name.com and GitHub (an inference in infra-netlify-34/39, not something anyone outside the accounts can check) | not verifiable from outside |

## 2. The decision this draft implements (register D-CONTACT, default)

* Public addresses are **role addresses on the domain**: `contact@`, `security@`, `corrections@` (exact names are the owner's choice; DEC-06 says "role names" are an owner input). They forward to a **private** mailbox. The current Gmail address stops being public and, above all, stops being anyone's recovery address.
* **Do NOT publish** the null MX / `v=spf1 -all` / `p=reject` set that infra-netlify-34 proposed. That set says "this domain neither sends nor receives mail", which makes role addresses impossible and contradicts the intake the plan needs (corrections, Report-a-problem, `security.txt`, permission emails, takedowns, teacher outreach).
* DMARC is staged: `p=none` with reports for 4 weeks, then `quarantine`, then `reject` (the ladder in section 5).
* CAA in Netlify's account-bound Let's Encrypt form, with `iodef` to `security@` (section 6).
* Replace shipped mailto text with a Report-a-problem form (Netlify Forms or a Function) plus an obfuscated fallback, an auto-responder, spam filtering and a stated response time; the privacy text must be updated first (a form collects what people type).

## 3. Inbound: how role addresses reach the owner

Two shapes; the owner picks one (register: "Forwarder, role names, send-as choice" are owner inputs). **This draft did not verify any provider's features, limits or price; check them at decision time.**

| Shape | What it is | Records it needs | Trade-offs |
|---|---|---|---|
| A. Forwarder | A service accepts mail for `@gettysburginteractivemap.com` and re-sends it to the private mailbox | 2 MX records pointing at the provider; an SPF `include:` for the provider (if the provider sends); DKIM CNAME/TXT records the provider gives you | cheapest and least to run; replying "as" the role address needs the provider's send-as or SMTP relay, or replies come from the private address |
| B. Hosted mailbox | A real mailbox for the domain at a mail provider | MX, SPF include, DKIM, sometimes a verification TXT | proper send-as; a recurring cost and one more account to secure |

Selection criteria (write down the answer before buying anything): works with Netlify DNS (MX/TXT/CNAME/CAA are supported, section 1); supports DKIM signing for anything it sends; SRS or ARC for forwarded mail; a spam filter; no requirement to move nameservers away from Netlify (moving NS would lose Netlify DNS conveniences; infra-netlify-34 recommends against moving); exportable mail; a named delegate can access it (D-CONTINUITY).

## 4. Records (placeholders in angle brackets; values come from the provider the owner chooses)

TTL 3600 unless noted. Add in this order and verify each before the next.

| # | Type | Name | Value | Notes |
|---|---|---|---|---|
| 1 | TXT | `@` | `google-site-verification=<from Search Console>` | verification without HTML edits (WP-T0-17 / WP-INFRA-35); independent of mail |
| 2 | TXT | `@` | Bing Webmaster verification value | same |
| 3 | MX | `@` | `<priority> <provider mail host>` (usually 2 records) | only after the owner has picked the forwarder/mailbox; **this is what makes role addresses work** |
| 4 | TXT | `@` | `v=spf1 include:<provider SPF host> ~all` | SPF is for mail sent AS the domain. Start with `~all` (soft fail), not `-all`. Only one SPF TXT record may exist; keep it under 255 characters per string |
| 5 | CNAME/TXT | `<selector>._domainkey` | provider's DKIM key | DKIM lets a receiver verify mail signed for the domain; needed before DMARC can go past `none` if the owner sends as the role address |
| 6 | TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:<dmarc-reports mailbox>; adkim=r; aspf=r; fo=1` | monitoring only; see the ladder below. `rua` reports go to a mailbox someone reads (a separate alias such as `dmarc@` is reasonable) |
| 7 | CAA | `@` | see section 6 | last, after the certificate renewal is confirmed |

Not to be added: `MX 0 .` (null MX), `v=spf1 -all`, `p=reject` on day one.

## 5. The DMARC ladder (proposal; steps and thresholds after the first are suggestions, not register text)

DMARC governs mail whose visible From address is `@gettysburginteractivemap.com`. It protects the domain from spoofing and governs replies the owner sends as a role address. It does **not** make third parties' inbound mail to the aliases fail: an inbound message is judged by the sender's own DMARC record when the forwarder or the private mailbox receives it (that is what SRS/ARC in the selection criteria are for).

| Step | Policy | Enter when | Stay/advance rule (suggested) |
|---|---|---|---|
| 0 | none published (today) | now | - |
| 1 | `p=none; rua=...` | MX, SPF, DKIM are live and a test message to each alias arrived | Read the aggregate reports for **4 weeks** (register). Advance only if every legitimate source (the forwarder, the send-as service, any Netlify Forms notification address) appears as aligned pass and nothing unknown is sending as the domain |
| 2 | `p=quarantine; pct=25`, then 50, then 100 (suggestion) | step 1 finished clean | keep each `pct` for about a week; return to `none` immediately if a legitimate sender starts failing |
| 3 | `p=reject` | quarantine at 100 for at least 2 clean weeks | the end state for a domain with a handful of legitimate senders; keep the `rua` mailbox; re-check after any change of provider |

Sub-domains: add `sp=` only when the owner knows what sends from sub-domains (there are none today; the staging site `gbg-staging` is on netlify.app, not this domain).

## 6. CAA (register: "account-bound Let's Encrypt form; iodef to security@")

Target records (NOT to be added yet):

```
@  CAA  0 issue "letsencrypt.org; accounturi=https://acme-v02.api.letsencrypt.org/acme/acct/<Netlify's ACME account id>"
@  CAA  0 issuewild "letsencrypt.org; accounturi=https://acme-v02.api.letsencrypt.org/acme/acct/<same>"
@  CAA  0 iodef "mailto:security@gettysburginteractivemap.com"
```

Cautions: (1) the plain `0 issue "letsencrypt.org"` form admits any Let's Encrypt customer, so it adds little; the account-bound form needs Netlify's ACME account id, which is **not known to this draft and was not verified**; (2) a wrong CAA record blocks certificate renewal; the certificate expires 2026-11-10 (infra-netlify-33), so add CAA only after the owner has confirmed the renewal happened and has the account id from Netlify; (3) the `iodef` address must exist first (section 3), or use the current Gmail temporarily and change it in the same session as the role address goes live.

## 7. `security.txt` (draft text; not published)

```
Contact: mailto:security@gettysburginteractivemap.com
Expires: <date at most 12 months ahead, RFC 9116>
Preferred-Languages: en
Canonical: https://gettysburginteractivemap.com/.well-known/security.txt
```

Netlify's handling of dot-folders: infra-netlify-09 says a manual deploy can strip `.well-known`, so the file needs a rewrite or another route; that belongs to the config/infra work packages, not this draft. Put the expiry in the owner's calendar (infra-netlify-33).

## 8. Site changes this needs (all later, none made here)

| Where | Change | Owner of the change |
|---|---|---|
| `privacy.html`, `terms.html` mailto | role address (`contact@` or `corrections@`); privacy states that email reaches the mailbox and, if a form is used, what the form stores | legal texts: this folder's drafts; T0 does not change the address (interim patches keep the Gmail on purpose) |
| `site-nav.js:194` footer "Contact" | role address or a link to the Report-a-problem form | shared-layer / copy work packages |
| Timeline credit (`bundle.pretty.js:112361-112365`) | remove the email from the credit (register: "remove the credit email from the timeline") | rebuild or a later bundle patch, not T0 (D-CONTACT ties it to C1) |
| Report-a-problem | Netlify Forms or a Function; spam trap; auto-reply; a stated response time (the plan mentions 3 days: an owner commitment, not a fact) | WP-DEC-06; privacy update first |
| `/.well-known/security.txt` | section 7 | infra work packages |

## 9. Account hygiene that goes with it (register action 6; owner actions)

* Passkeys/2FA on the private mailbox first, then Netlify, Mapbox, Google Cloud, Name.com, GitHub; recovery codes stored offline.
* Move recovery for those accounts **off the public Gmail** to the private mailbox; a named delegate (D-CONTINUITY).
* Name.com: 2FA, transfer lock kept, auto-renew, multi-year term (domain expires 2027-06-13 per infra-netlify-33/34).

## 10. Acceptance (from the register: "test mail to every alias arrives; DMARC alignment passes for forwarded mail; no personal Gmail in shipped HTML")

Commands to run when it is done (none run yet):

```
# records (DoH, no tools needed)
curl -s -H "accept: application/dns-json" "https://cloudflare-dns.com/dns-query?name=gettysburginteractivemap.com&type=MX"
curl -s -H "accept: application/dns-json" "https://cloudflare-dns.com/dns-query?name=_dmarc.gettysburginteractivemap.com&type=TXT"
curl -s -H "accept: application/dns-json" "https://cloudflare-dns.com/dns-query?name=gettysburginteractivemap.com&type=CAA"
# a test message from an outside mailbox to contact@, security@, corrections@ arrives; the received headers show spf=pass or dkim=pass for the sending path
# no personal address in a built release
grep -rn "gmail.com" release/R1c/dist --include=*.html --include=*.js -l
```

## 11. Owner decisions needed before anyone acts

1. Role names (`contact@`, `security@`, `corrections@`, `dmarc@`?) and where each goes.
2. Forwarder or hosted mailbox; does the owner want to reply as a role address (send-as)?
3. The private mailbox and its delegate.
4. Whether to promise a response time publicly (and which).
5. Confirm Netlify's ACME account id availability before any CAA change; confirm the 2026-11-10 certificate renewal.
6. Report-a-problem: form or mailto-only for now.

## 12. Not verified in this draft

Provider features, prices and limits; Netlify's ACME account id; whether the Gmail account has forwarding or filters; who else can read that mailbox; whether any of the accounts in section 9 actually use the public address for recovery (an inference from infra-netlify-34/39).
