# Resolutions of the 47 conflicts

One `C-0xx.json` (the resolution record) and one `C-0xx.md` (a plain-English account of at most two pages) per conflict, written by the researcher of that conflict. Format, rubric and checks: `../PLAN.md`; enumerations: `../schema.json`; first retrieval: `../dossiers/C-0xx.md`; validator: `python3 -I tools/bt/conflicts/validate_resolution.py C-0xx` (and `--all --complete` for all 47). A resolution that fails the validator stays out of the integration step and is reported.
