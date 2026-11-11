"""Licence-scope policy for the ACWII mod assets (owner decision DEC-DELEG-F, 2026-11-11).
Legal basis, recorded as given: owner-reported verbal permission from the mod author, 2026-11-11; no written text on file. The mod author (Subversion author ACW_Primergy, ACWII, 2011)
can license only files he made. So every file is decided by evidence, and a file is INCLUDED only when ALL of these hold:
  (E1) a Subversion record in the pack data names ACW_Primergy as committer AND the file's md5 equals the committed md5 (bytes are the committed revision);
  (E2) no stock-lineage marker (see STOCK_* below) in the file name, path, sub-mesh/material names or texture references;
  (E3) it is not a placeholder image, is in scope (figure/officer/flag/gun/horse asset), and is decoded and verified by this tool.
Anything else is EXCLUDED with its reason codes. An SVN committer record proves who committed, not who drew it: that is why E2 can veto E1 (a re-skinned base-game mesh committed by the modder is still base-game derived)."""
import re

LICENCE_BASIS = 'owner-reported verbal permission from the mod author, 2026-11-11; no written text on file'
CREDIT = "ACWII mod by ACW_Primergy and team (used with the author's permission)"
SVN_AUTHOR = 'ACW_Primergy'
PLACEHOLDER_MIN_COPIES = 20      # a texture byte-identical in >= 20 places of the part tree is a tool placeholder (viewed: a light-bulb icon), not artwork

# base-game families named by the owner (norwegian_ski_troops) or by faction naming not belonging to the American Civil War (ottoman_commodore)
STOCK_SUBMESH_PREFIXES = ('norwegian_ski_troops', 'ottoman_commodore')
STOCK_FILE_PREFIXES = ('euro_', 'episodic_', 'west_euro_')          # base-game asset families (e.g. variantmodels/unitparts/euro/)
STOCK_NUMBERED = re.compile(r'^(officer|general)\d_')               # generic numbered base-game names (officer3, general3_north)
STOCK_PATH_TOKENS = ('/unitparts/euro/', '_skinparts_cossack', 'head_cossack', 'head_hungarian', '_skinparts_english', 'head_english')
STOCK_TEXTURE_TOKENS = ('field_carriage', 'euro_cannon_barrel', 'norwegian_ski_troops')

CODES = {
    'E1-SVN': 'Subversion record names ACW_Primergy and the md5 of the file equals the committed md5',
    'NO-SVN': 'no Subversion record for this file: mod authorship is not evidenced, so it is unclear and excluded',
    'S-SUBMESH': 'sub-mesh names carry a base-game family (norwegian_ski_troops / ottoman_commodore): the geometry is derived from a base-game mesh',
    'S-FILENAME': 'file name in a base-game family (euro_, episodic_, officer3/general3 ...)',
    'S-PATH': 'path names a base-game part family (unitparts/euro, cossack, hungarian, english heads)',
    'S-TEXREF': 'the model references base-game texture names (field_carriage_*, euro_cannon_barrel_*); derivation from a base-game carriage cannot be ruled out',
    'S-IDENTICAL': 'byte-identical to a file in the base-game namespace (unitparts/euro): a copy, not new work',
    'S-LODCOPY': 'all LOD files are byte-identical copies of one file: a copy, not four authored LODs',
    'PAIRED-STOCK-MESH': 'texture atlas is the UV sheet of a base-game-derived mesh and carries base-game face photographs (viewed)',
    'PLACEHOLDER': 'tool placeholder image (identical in many places; a light-bulb icon), not artwork',
    'DECODE-UNVERIFIED': 'this tool does not decode/verify this file type well enough to place or render it (gap EG-FIG-0012)',
    'ATLAS-MIXED': 'baked atlas that mixes garment cells with base-game face cells; per-cell authorship unknown',
    'ANACHRONISM': 'viewed in the decoder self-test: a modern fictional character (school-uniform figure), not a soldier of 1863; it is also not referenced by any mod table',
    'OUT-OF-SCOPE': 'not a figure, officer, flag, gun or horse asset (terrain, building, fence, UI, audio, data)',
    'NOT-ART': 'not an art asset (tool housekeeping or data)',
    'INCLUDED': 'all of E1, E2, E3 hold',
}

def stock_markers(rel_path, submesh_names=(), texture_names=()):
    """rel_path uses '/'; returns a sorted list of S-* codes."""
    out = set(); low = '/' + rel_path.lower(); base = low.rsplit('/', 1)[-1]
    if base.startswith(STOCK_FILE_PREFIXES) or STOCK_NUMBERED.match(base): out.add('S-FILENAME')
    if any(t in low for t in STOCK_PATH_TOKENS): out.add('S-PATH')
    if any(n.lower().startswith(STOCK_SUBMESH_PREFIXES) for n in submesh_names): out.add('S-SUBMESH')
    if any(any(t in n.lower() for t in STOCK_TEXTURE_TOKENS) for n in texture_names) or any(t in base for t in STOCK_TEXTURE_TOKENS): out.add('S-TEXREF')
    return sorted(out)
