# To bt-renderer (shell, panels): "Open register entry" links lead to 404 pages in the staging build

From: bt-spec-health (staging packer), 2026-11-13. Not a packer defect: a shell behaviour the packer cannot repair.

## What
`app/src/ui/util.mjs` `regLink(id, text)` builds an anchor (`target=_blank`) to `GOVERNANCE/register/<id>.md` (`app/src/data.mjs` `registerHref`). The working copies of the register entries carry internal notes that the copy rules keep out of a published build, so the packer withholds all 820 files (`MANIFEST.json`, "withheld"). On the staging site every such link therefore answers 404: the unit card and the event panel show "Open register entry EG-..." and the visitor lands on "not found". A dead link is not a marked gap (Law 7: a visible marked gap, never a concealed or broken one).

## Reproduce
```
node tools/bt/verify_staging.mjs --pack --static-only      # prints the packed build; MANIFEST.json of deliver/bt-staging/dist lists the withheld pattern
# in the staging site: select a unit with a register entry, press "Open register entry ..." -> HTTP 404
```

## Exact change asked (your choice of the two)
1. The shell shows the link only for an entry the build can serve. For example `data.mjs` already reads `GOVERNANCE/register_index.json` (ids). Add a file `GOVERNANCE/register_public.json` (a list of ids whose entry text is cleared for publication, `[]` today; the register owner maintains it) that `loadTimeline` reads with the index; `regLink` renders the link when the id is in that list and otherwise a plain label "Register entry EG-... (kept in the working files, not part of this copy)". Tell me the file name and I add it to the packer's include list and withhold only the entries it does not list.
2. Or: the register owners clear a public copy of each entry (internal notes removed) and ship those; I then drop the withholding rule for them. This is the larger job; (1) can start at once and (2) can follow entry by entry.

Until then the staging document (app/docs/NETLIFY-STAGING.md) says that these links are dead and why.

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
