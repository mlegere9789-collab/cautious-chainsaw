# bt-oob-kit us-art-corps: defect of kit_overrides.py compile --dry-run

`python -I tools/bt/kit_overrides.py compile --dry-run --group us-art-corps` crashes:

```
File "tools/bt/kit_overrides.py", line 285, in c_guns
    alts = [{'alt': o['conflict']['alt'], ...} for o in sel]
KeyError: 'conflict'
```

Cause: in `c_guns`, when any line of `sel` (guns present or engaged at battery level in the battle window) carries a conflict, the list of alternatives is built from every line of `sel`, but a battery that has a conflict set at one date and plain lines at other dates (Second Maine: 1 July without conflict, 2 July conflict set; 4th US G, Rorty's battery and others) has lines without `conflict`. Suggested fix: build the alternatives only from the lines with a `conflict` (or group `sel` by `as_of` and test each date), e.g. `alts = [... for o in sel if o.get('conflict')]`.

With that one expression patched in memory (the file was not edited), the dry run gives: 41 operations, 44 unapplied (13 routed to the verified tables by design, 31 to review: piece types left as candidates, four conflict sets, joined cards).
