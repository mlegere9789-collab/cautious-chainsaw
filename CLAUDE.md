# Gettysburg Interactive Map: standing instructions

## Owner's governing text
The 144-page "Gettysburg Total War animation plan, version 2" (C:\Users\mlege\Downloads\Gettysburg Total War animation plan v2.pdf) governs the Battle Theatre (Part F) and the evidence standards of the whole site. Its text is in `docs/battle-theatre/BIBLE/plan-clean.txt` (copy of tmp/pdf) (page markers `=== PAGE n ===`). Reading notes, page map and defect list: `docs/battle-theatre/BIBLE/`. Governance files: `docs/battle-theatre/GOVERNANCE/` (requirements.json, gates.json, register/, decision_log.md, conflict_register.json, timeline_seed.jsonl, library/status.json, budget/, hardware_profile.json, progress.md). Regenerate with `python tools/bt/seed_governance.py && (cd tools/bt && python seed_register.py)`; check with `python tools/bt/check_governance.py`.

## The Law (PDF Part E, compressed; every clause applies to every task)
1. All 22 requirements (R01-R22) are binding. Never drop, water down, defer indefinitely or silently narrow a requirement, data item, unit, soldier, fence, tree, minute or quality bar. "Too much work / good enough / for now" is never a reason. Break work down and do it.
2. Claude does the work itself. Owner-only acts are legal acts (accounts, licence acceptance, billing, sending permission requests) and recorded decisions.
3. Where record or physics makes literal 100% impossible: build the strongest evidence-based reconstruction, register it (Evidence-Gap Register, tier), mark it in the product, escalate it in the Decision Log. Never claim an exception.
4. Never fabricate: no invented quote, measurement, name, unit detail, time, number, citation or URL. A failed lookup is recorded as failed. Nothing is "documented" without a non-lead source that supports exactly that claim (not Wikipedia, forums, blogs, auction pages or memory).
5. A belief in an exception is a problem to solve or escalate, not permission to skip.
6. Only the owner decides scope reductions and default views of conflicting sources. Absent a recorded decision the requirement stands in full.
7. A visible marked gap is required where evidence is missing; a concealed gap is a violation.
8. Efficiency never lowers the bar. Gates are never lowered to pass.

## Hard rules for Battle Theatre work
- Tiers: documented / inferred / plausible-procedural; open gaps live in `register/`. Timeline rows are `seeded_unverified` until checked against a primary source.
- No unit, soldier, horse, gun, wagon or flag appears before its earliest documented arrival; arrival is a march, not a spawn. Ledger: PDF B.2.4.
- No earthwork is pre-placed; built on screen in the sourced window. Features that pre-existed (Angle wall etc., PDF B.7.3) are never given a construction animation. Do not derive 1863 profiles from modern (rebuilt) Culp's Hill, Little Round Top or Cemetery Ridge walls.
- Night is night but never black: luminance floor (gate Q10). Smoke, dust, sound delay = distance / speed of sound.
- Soldiers are instanced one-to-one up to the strength figure; no performance capping without an owner decision. Strengths and casualties are ranges with a declared basis.
- Carry every source conflict as a selectable scenario. Do not pick a default; the PDF's recommended defaults are logged as PENDING OWNER.
- Product marking: the "reviewed by automated subagents / not reviewed by a historian" label is DROPPED by owner decision DEC-006 (2026-10-19). Tier marking of non-documented content stays.
- Do not report a milestone complete unless the Section Z checklist is true and `check_governance.py` passes. Never mark `passes` true without running the gate.
- Efficiency (PDF Section C): one feature per session, extract-once ledger, content-hash caches, headless bulk jobs with caps, files are the memory (`progress.md`).

## Standing owner constraints (from the owner's chat)
- Nothing is deployed to the live site by Claude; the owner publishes drag-and-drop zips. No credentials, accounts or API keys by Claude; no bot-block circumvention; the personal Gmail is never published. Do not break the Virtual Walkthrough or Monuments sections. Use they/them for people whose pronouns are unstated.
- Owner chat additions (OA01-OA09 in requirements.json) are kept separate from PDF wording. Where they conflict with the PDF (audio labeling, engine, "100%"), see decision_log.md DEC-001..005 and do not silently pick.

## End-of-mission acceptance
Before ANY release zip or Battle Theatre milestone is handed over, run `docs/battle-theatre/GOVERNANCE/FINAL-ACCEPTANCE.md`: 8 consecutive fresh clean passes (any defect resets to 0), regression against the current published build (production deploy 6abd6d62...), performance all green, design polish, tutorial PDF updated, and the copy audit: no mention of AI/Claude/Anthropic or how the site was built in any shipped file or metadata.
