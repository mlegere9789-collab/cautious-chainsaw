# Request: holds note repeats its own subject (conflict-defaults.json, e.g. C-014)

Seen in the Sources panel, "Why this default": "The plan's value does not hold: The range 218 to 368 does not hold: ..." The viewer writes "The plan's value <holds/does not hold>:" before holds.pdf_default.note; for C-014 (and possibly others) the note itself begins with the same verdict. Owner of tools/bt/build_conflict_defaults.mjs / the resolution files: start each holds note without the verdict, or tell the viewer to omit its prefix. Not changed here (data file and builder are outside the panel's remit).
