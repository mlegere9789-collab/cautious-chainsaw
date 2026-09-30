# /corrections and "About the clock": page drafts

> **Status: DRAFT COPY. Nothing here is approved by the owner or a historian, and nothing here is published until they approve it.** The wording is proposed; the register gives the owner the final say on wording (owner decision 11). The corrections log below is empty on purpose: entries are added only when a fix has shipped and a reviewer has signed the historical part. Statements about what the site does today are facts about the software and can be checked (see `docs/editorial/time-audit.md`); statements about 1863 stay `proposed` until signed.

---

## Page 1: Corrections

**How this page works**

The Gettysburg Interactive Map reconstructs three days of 1863 from published sources. It contains errors, and when we find one we say so here: the date, what it said, what it says now, and the source for the change. Nothing is removed without a note.

**Report a problem.** Use the Report-a-problem form on any page, or write to corrections@ (the address on this domain; see the contact plan). Tell us where you saw it, what you think is wrong, and your source (author, title, page) if you have one. You do not need to give your name. We aim to acknowledge every report within three days [target, owner to confirm]. We do not publish reports or personal details.

**How we decide.** A named historical reviewer checks each historical correction against the sources; a second reader confirms a sample. Times are shown as "about" until an item has been reviewed and signed (see About the clock). If historians disagree, we show the range and say so instead of picking a winner.

**Log** (newest first)

| date | item | was | now | source | reviewed by |
|---|---|---|---|---|---|
| _no entries yet_ | | | | | |

### Entry format

`YYYY-MM-DD` | the item (a page, a moment, a time) | the old text, quoted | the new text, quoted | the source (work, edition, page) | the reviewer's initials or "reviewer on file".

### Candidate entries (held: publish each with the release that ships it, after the reviewer signs the historical part)

These are the defects the audit measured. The first group are facts about the software; the second are proposals about history and stay unpublished until decided.

**About the software (checkable today, publish when fixed)**

1. *The map's date badge.* Was: "July 3, 1863" to "July 5, 1863" while the map showed July 1 to 3. Now: the calendar date, "July 1, 1863" to "July 3, 1863". Cause: a "+ 2" in three places in the code. (`tests/time`, TM-V9.)
2. *One clock everywhere.* Was: nine different formulas turned a tick into a time, so the same moment showed 8:15 AM on the toolbar, 7:20 AM on the event card and "7:15 AM July 3" on a monument tooltip. Now: one clock. (`docs/editorial/formula-inventory.md`.)
3. *Hour buttons.* Was: "1 hour" moved 12 steps, which is between 12 minutes and 42 hours of battle time. Now: 60 minutes of battle time.
4. *Speed label.* Was: "1x (real time)". The map is a time-lapse: at 1x it covers between 1.7 and 84.7 minutes of battle time per second.
5. *Map metadata.* Was: the data files said "430,000+ placement records" and "600-700 units per tick"; the files hold 1,804 records on 188 of 675 ticks, and one file claimed 4,890 records but held 100.

**About history (proposed only; each needs the reviewer)**

6. Clock times on event cards. Was: hand-typed labels, within 30 minutes of the sourced time for 5 of 102 events. Now: a clock derived from 33 reviewed anchors [only after review], shown as "about".
7. Events on the wrong day or out of order (4 wrong-day, 12 out-of-order, 9 merged, 2 quotations without a source found): each becomes its own entry when the reviewer decides it. Examples in the triage: the Lee-Longstreet meeting (the label said "3:20pm" on July 2; the specialist's sources put it about 4:30 AM on July 3, within 3:00 to 5:30) [proposed]; Alexander's second note (the site quotes it as the first).
8. Vignette text: "exactly eight days" and "four days" (Custer, Farnsworth); "7:30 in the morning" for Colgrove's charge; "Colonize" for "Colonel". [reviewer to decide each]
9. Quotations: the Avery note and the Lincoln line: one source, or removal, each.

---

## Page 2: About the clock

**Why the map has a clock at all.** The map is a time-lapse of about 675 frames between dawn on July 1 and the evening of July 3, 1863. Each frame is a step in the story, not a fixed five minutes: in the quiet stretches a step can be 40 minutes of the battle, in the fighting under a minute. The clock tells you when, on the day, each frame falls.

**How we set it.** We tied the frames to 33 moments whose time is documented, such as the first shot, the opening of the cannonade and the wall at the Angle, and drew straight lines of time between them. Between two documented moments the clock is our interpolation, not a record.

**What "about" means.** Sources for 1863 disagree by 15 to 30 minutes for most events and by hours for a few. Until a historian has reviewed a time, the map prints it as "about" and rounds it to five minutes. Five of the 33 moments are contested by the sources and need a decision (the step-off of Pickett's Charge, the 20th Maine's bayonet charge, Sickles's advance, Lee's order to Ewell, the arrival of the XII Corps); we say which.

**Which clock.** Local mean time at Gettysburg. There were no time zones in 1863; officers set watches by the sun or by headquarters. Eastern Standard Time would be about nine minutes later.

**Night.** Between midnight and dawn the date reads "Night of July 1-2": the calendar date changes at midnight, the day tabs change at first light.

**Sources.** The page "Sources & Times" lists every moment with its accepted range, the kind of evidence (primary report, scholarship, compilation, search summary) and the source keys. Stone Sentinels, The History Junkie and Civil War Cycling are compilations of low authority and are labelled so.

**Fallback wording when nothing has been reviewed:** "Unreviewed reconstruction. Times are approximate. Sources disagree by 15 to 30 minutes, and the map plays as a time-lapse."

### Copy rules this draft follows

- No "real time", "five-minute" or "minute-by-minute" (chapter 04 section 4.9). "Moment by moment" is proposed for approval.
- No "reviewed", "verified" or "accurate to the minute" until a signed decision exists (TM-V18).
- No tick numbers in visible text; a frame number appears only in a tooltip or a debug view.
- Everything in this file is a draft for the owner; no reviewer, contact address or date has been fixed.
