# Cluster definitions, Bachelder 1876 July-1 sheet pixel frame ("a-frame", LoC cw0325000a, 8292x10756 px).
# A symbol is given as px=(x,y) (snapped to the nearest ink blob within 10 px) or det=<id in mapwork/det2.json>.
# anchor=True + cty=<2023 Adams County outline index>: the standing building is judged to be the same building as the symbol.
C = {}


def cluster(key, label, syms, notes=''):
    C[key] = dict(label=label, symbols=syms, notes=notes)


def sym(px=None, role='building', letter=None, cty=None, anchor=False, note='', det=None):
    return dict(px=px, det=det, role=role, letter=letter, cty=cty, anchor=anchor, note=note)


cluster('sherfy', 'J. SHERFY', [sym((3532, 6902), 'house', 'S', 10287, True), sym((3510, 6913), 'outbuilding', 'W'),
                                sym((3536, 6974), 'barn', 'W', 4665, True)])
cluster('klingel', 'D. KLINGEL (map label near symbol reads J. SMITH)', [sym((3753, 6655), 'house', 'W', 6979, True), sym((3805, 6602), 'building', 'W')])
cluster('codori', 'N. CODORI', [sym((4320, 6006), 'house', 'B', 9137, True), sym((4272, 6059), 'barn', 'W', 10863, True), sym((4286, 6038), 'outbuilding', 'W')])
cluster('spangler_h', 'H. SPANGLER', [sym((3441, 6396), 'barn', 'W', 1977, True), sym((3469, 6377), 'outbuilding', 'W'),
                                      sym((3493, 6368), 'house', 'W', 346, False, 'symbol is 28 px N of the surviving house outline; not used as anchor'),
                                      sym((3530, 6370), 'building', 'S'), sym((3465, 6331), 'building', None)])
cluster('rogers', 'P. ROGERS', [sym((3948, 6373), 'building', 'W'), sym((3971, 6360), 'building', 'W'), sym((3972, 6384), 'building', None)])
cluster('trostle', 'A. TROSTLE', [sym((4100, 7072), 'barn', 'B', 14014, True), sym((4122, 7084), 'building', 'W'), sym((4135, 7113), 'house', 'W', 10049, True)])
cluster('slyder', 'J. SLYDER', [sym((3801, 8516), 'house', 'W', 12158, True), sym((3752, 8532), 'building', 'W'), sym((3785, 8548), 'barn', 'W', 6452, True)])
cluster('bushman', 'M. BUSHMAN', [sym((3363, 8398), 'house', 'S', 4852, True)])
cluster('rose', 'J. ROSE', [sym((3534, 7631), 'house', 'S', 4419, True), sym((3511, 7600), 'building', 'W'),
                            sym((3480, 7580), 'barn', None, None, False, 'largest symbol of the farm; the barn ruin is documented by NPS')])
cluster('snyder', 'P. SNYDER', [sym((2992, 7077), 'building', 'W'), sym((3013, 7092), 'building', 'W')])
cluster('warfield', 'J. WARFIELD', [sym((3017, 7126), 'house', 'W', 9546, True), sym((3048, 7119), 'building', 'W'), sym((2984, 7134), 'building', 'W'), sym((2964, 7142), 'building', 'W')])
cluster('gweikert', 'GEORGE WEIKERT', [sym((4757, 7008), 'building', 'S'), sym((4743, 7027), 'house', 'W', 8549, True), sym((4733, 7047), 'building', 'W', 11108),
                                       sym((4692, 7054), 'barn', 'W', 2870, True), sym((4769, 7052), 'building', None)])
cluster('hummelbaugh', 'J. HUMMERBACH (Hummelbaugh)', [sym((4962, 6383), 'building', 'W', 13683), sym((5008, 6383), 'house', 'W', 3580, True)])
cluster('leister', 'M. LEISTER', [sym((4921, 5692), 'house', 'W', 13528, True), sym((4936, 5675), 'building', 'W'), sym((4938, 5690), 'building', 'W')])
cluster('bryan', 'BRYAN (Brien)', [sym((4686, 5560), 'house', 'W', 4533, True), sym((4672, 5578), 'barn', 'W', 5509, True)])
cluster('fry', 'M. FRY (Frey)', [sym(det=8139, role='building', letter='W'), sym(det=8156, role='building', letter='W'), sym(det=8147, role='building', letter='W')])
cluster('patterson', 'S. PATTERSON', [sym(det=8415, role='building', letter='W'), sym(det=8432, role='building', letter='W'), sym(det=8443, role='building', letter='W')])
cluster('jweikert', 'J. WEIKERT', [sym(det=8557, role='building', letter='W'), sym(det=8565, role='building', letter='W'), sym(det=8580, role='building', letter='W')])
cluster('culp', 'WM. CULP', [sym(det=4093, role='building', letter='W'), sym(det=4119, role='building', letter='W'), sym(det=4142, role='building', letter='S'),
                              sym(det=4188, role='building', letter='W'), sym(det=4182, role='building', letter='W')])
cluster('mcmillan', 'D. McMILLAN', [sym((3868, 4705), 'house', 'W', 12743, True), sym((3865, 4660), 'building', 'W'), sym((3893, 4731), 'building', 'W')])
cluster('bliss', 'W. BLISS', [sym((4180, 5388), 'house', 'W'), sym((4170, 5466), 'barn', 'W')],
        'Burned by Union troops on 3 July 1863; never rebuilt (NPS)')
cluster('wentz', 'J. WENTZ', [sym((3487, 7098), 'house', 'W'), sym((3514, 7088), 'building', 'W'), sym((3516, 7072), 'building', 'W')])
cluster('forney', 'J. FORNEY', [sym(det=1790, role='building', letter='W')])
cluster('hagy_beams', 'HAGY / BEAMS (McClean tenants)', [sym(det=2225), sym(det=2222), sym(det=2274), sym(det=2301)])
cluster('mclean', 'M. McLEAN', [sym((4163, 2206), 'house', 'W', 5437, True), sym((4154, 2267), 'barn', 'W', 7678, True)])
cluster('mcpherson', 'E. McPHERSON', [sym((3186, 3257), 'barn', 'W', 11495, True)])
cluster('almshouse', 'COUNTY ALMSHOUSE', [sym(det=i) for i in (2288, 2292, 2312, 2353, 2359, 2378, 2388, 2391, 2402, 2403, 2409, 2427, 2428)])
