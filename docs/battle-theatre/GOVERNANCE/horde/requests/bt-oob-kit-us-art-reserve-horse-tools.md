# bt-oob-kit us-art-reserve-horse: kit_overrides.py compile --dry-run, c_guns with a conflict set and plain lines

Step 1 of this group: `python3 -I tools/bt/kit_overrides.py compile --dry-run --group us-art-corps` crashed in `c_guns` with `KeyError: 'conflict'` when a battery's guns lines at battery level mixed a conflict set and plain dated lines (the four conflict sets of us-art-corps: Wilkeson, Hall, Heckman, Rorty; `bt-oob-kit-us-art-corps-tools.md`).

Fix (tools/bt/kit_overrides.py, `c_guns`): the alternatives are built only from the lines that carry `conflict`; those lines are left unapplied (a delegated decision names the default) and the card is unchanged. Plain lines of the same battery are applied only where their earliest date is earlier than the earliest date of the conflict set (the card takes the earliest date of the record); otherwise they are left unapplied with the reason that the earliest date is contested, so nothing is chosen between the alternatives by the back door.

Test (red first): `tests/governance/test_kit_overrides_guns_mixed.py` (three cases: a conflict set on a later date than a plain line; a conflict set on the earliest date with a later plain line; only conflict lines). It raised `KeyError: 'conflict'` before the fix and passes after it. `python -I tools/bt/kit_overrides_selftest.py` still gives 93 checks, 0 failed.

Result: `compile --dry-run --group us-art-corps`: 41 operations, 46 unapplied. `compile --dry-run --group us-art-reserve-horse`: 32 operations, 48 unapplied (14 routed by design, 34 to review).
