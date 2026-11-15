# Readings of the further resources (card backs, mount versos, copy negatives) of the records of the wide search, written on 2026-11-15 after the images were looked at (wide_extra_images_ledger.json).
# Each statement below is what is printed or written on the image, read from the image (the card backs also at 1024 px where the print is too small at 640 px); none gives a camera place or a direction of view.
# build_registry.py appends one sentence per record to the registry entry; a record without an entry here gets GENERIC.
GENERIC = "the text on them is a title or label, a series list, the publisher's caption of what the picture shows, a studio stamp or an owner's note; none states a camera place or a direction"
# War Photograph and Exhibition Company card backs (printed caption paragraph above the line '1861 - Photographic History - 1865'), read at 1024 px: card number -> what the caption says (the subject, never the camera)
CAPTION = {
    '2004682780': (2288, "describes the men: three prisoners captured at Gettysburg and their clothing"),
    '2025163097': (2288, "describes the men: three prisoners captured at Gettysburg and their clothing"),
    '2011648013': (266, "says that the 9th Massachusetts Battery was stationed in the yard and barnyard at Trossel's place and that the view shows where one of its guns stood"),
    '2011649196': (2391, "says that the trees are near Culp's Hill and were marked by bullets and shell"),
    '2011649197': (2391, "says that the trees are near Culp's Hill and were marked by bullets and shell"),
    '2011649968': (245, "says that the group of dead was in 'the wheat-field'"),
    '2025167175': (245, "says that the group of dead was in 'the wheat-field'"),
    '2011649969': (253, "says that the woods at the foot of Round Top, the right of the Union line, were named the slaughter-pen"),
    '2025167831': (253, "says that the woods at the foot of Round Top, the right of the Union line, were named the slaughter-pen"),
    '2011649970': (274, "describes a Union soldier killed by a shell at Gettysburg on July 3, 1863"),
    '2011660054': (259, "says that the house was the headquarters of the Union army and that the horses of General Meade's aides were hitched to the fence and trees near it"),
    '2025169709': (259, "says that the house was the headquarters of the Union army and that the horses of General Meade's aides were hitched to the fence and trees near it"),
    '2011660071': (2401, "describes John Burns after the battle at his cottage door (a portrait)"),
    '2025163077': (2401, "describes John Burns after the battle at his cottage door (a portrait)"),
    '2025167173': (243, "describes a group of Union dead on the right of the Federal lines on July 1, 1863, killed by canister"),
}
NOTABLE = {
    '2004682792': "the back is a printed list of the series 'Sights and scenes from the battle-field of Gettysburg' (titles only); the two copy negatives are of the same card",
    '2013645948': "the mount verso carries a handwritten note that the Library's title repeats (the house, the barn on the left, General Sickles's headquarters); it describes the subject, not the camera",
    '2025160089': "the mount verso carries the printed text of the Sketch Book plate (read at 1024 px): it says that the house 'is in front of the left of the position occupied by our army', that General Sickles established his headquarters near it and was wounded in its vicinity; it describes the subject and gives no camera place or direction",
    '2019635468': "the card verso carries the studio stamp, the ink notation 'Gettysburg' (all that the Library transcribes) and, in faint pencil in another hand, 'original by Tyson in August 1863' (read at 1024 px; the hand and the date of the note are unknown): if the note is right this is a view of August, not of July 1863; no camera place or direction",
    '2020634839': "the card verso carries the studio stamp and the ink notation 'Cemetery Gate Gettysburg'; no camera place or direction",
    '2011649195': "the card back (W. H. Tipton and Co., Nos. 514 to 516, 'Views along our right wing', read at 1024 px) names the regiments that charged and the woods held by Johnston's division, that is what the picture shows; no camera place or direction",
    '2011649966': "the card back is Mumper and Co.'s printed list of its Gettysburg battle-field view titles (titles only)",
    '2025167167': "the card back is a printed list of the series 'Sights and scenes from the battle-field of Gettysburg' (titles only)",
    '2014647511': "the second resource of the record (ppmsca.38374, the verso of the card) shows a second picture: a small print of the slaughter pen (the woods at the foot of Little Round Top, a body at the left) with the card's caption No. 253; a near-field wood view with which the model cannot be compared, on the back of a portrait card",
}
def sentence(pk, extras):
    """extras: the medium-derivative ledger entries of the record (list of dicts with 'note')."""
    n = len(extras); backs = sum(1 for e in extras if 'back' in (e.get('note') or '')); negs = sum(1 for e in extras if 'copy neg' in (e.get('note') or ''))
    kinds = ', '.join(x for x in (f'{backs} back(s) of a card or mount' if backs else '', f'{negs} copy negative(s)' if negs else '', f'{n - backs - negs} other' if n - backs - negs else '') if x)
    if pk in NOTABLE: what = NOTABLE[pk]
    elif pk in CAPTION: num, text = CAPTION[pk]; what = f"the card back carries the publisher's caption No. {num} (War Photograph and Exhibition Company, read at 1024 px): it {text}; no camera place or direction"
    else: what = GENERIC
    return f" Further images of this record ({n}: {kinds}), fetched on 2026-11-15 and looked at: {what}."
