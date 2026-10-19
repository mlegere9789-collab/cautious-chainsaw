# Cluster definitions, Bachelder 1876 July-1 sheet pixel frame ("a-frame", LoC cw0325000a, 8292x10756 px).
# A symbol is given as px=(x,y) (snapped to the nearest ink blob within 10 px) or det=<id in mapwork/det2.json>.
# anchor=True + cty=<2023 Adams County outline index>: the standing building is judged to be the same building as the symbol.
C = {}


def cluster(key, label, syms, notes=''):
    C[key] = dict(label=label, symbols=syms, notes=notes)


def sym(px=None, role='building', letter=None, cty=None, anchor=False, note='', det=None, detd=None):
    return dict(px=px, det=det, detd=detd, role=role, letter=letter, cty=cty, anchor=anchor, note=note)


cluster('sherfy', 'J. SHERFY', [sym((3532, 6902), 'house', 'S', 10287, True), sym((3510, 6913), 'outbuilding', 'W'),
                                sym((3536, 6974), 'barn', 'W', 4665, True)])
cluster('klingel', 'D. KLINGEL (map label near symbol reads J. SMITH)', [sym((3753, 6655), 'house', 'W', 6979, True), sym((3805, 6602), 'building', 'W')])
cluster('codori', 'N. CODORI', [sym((4320, 6006), 'house', 'B', 9137, True), sym((4272, 6059), 'barn', 'W', 10863, True), sym((4286, 6038), 'outbuilding', 'W')])
cluster('spangler_h', 'H. SPANGLER', [sym(det=7601, role='barn', letter='W', cty=1977, anchor=True), sym(det=7566, role='building', letter='W'),
                                      sym(det=7545, role='house', letter='W', cty=346, note='symbol lies 28 m from the surviving house outline in the global georeference; not used as anchor'),
                                      sym(det=7558, role='building', letter='S'), sym(det=7507, role='building')])
cluster('rogers', 'P. ROGERS', [sym(px=(3949, 6377), role='building', letter='W', note='rotated square symbol, not picked up by the blob detector; position read by eye'), sym(det=7541, role='building', letter='W'), sym(px=(3972, 6385), role='building', note='small unlettered blob, position read by eye')])
cluster('trostle', 'A. TROSTLE', [sym((4100, 7072), 'barn', 'B', 14014, True), sym((4122, 7084), 'building', 'W'), sym((4135, 7113), 'house', 'W', 10049, True)])
cluster('slyder', 'J. SLYDER', [sym(det=9312, role='house', letter='W', cty=12158, anchor=True), sym(det=9344, role='building', letter='W'), sym(det=9358, role='barn', letter='W', cty=6452, anchor=True)])
cluster('bushman', 'M. BUSHMAN', [sym(det=9233, role='house', letter='S', cty=4852, anchor=True), sym(px=(3347, 8448), role='barn', letter='W', cty=701, anchor=True, note='rotated square symbol read by eye')])
cluster('rose', 'J. ROSE', [sym(det=8682, role='house', letter='S', cty=4419, anchor=True), sym(det=8667, role='building', letter='W'),
                            sym(det=8650, role='barn', letter=None, note='largest symbol of the farm; the barn ruin is documented by NPS')])
cluster('snyder', 'P. SNYDER', [sym((2992, 7077), 'building', 'W'), sym((3013, 7092), 'building', 'W')])
cluster('warfield', 'J. WARFIELD', [sym((3017, 7126), 'house', 'W', 9546, True), sym((3048, 7119), 'building', 'W'), sym((2984, 7134), 'building', 'W'), sym((2964, 7142), 'building', 'W')])
cluster('gweikert', 'GEORGE WEIKERT', [sym((4757, 7008), 'building', 'S'), sym((4743, 7027), 'house', 'W', 8549, True), sym((4733, 7047), 'building', 'W', 11108),
                                       sym((4692, 7054), 'barn', 'W', 2870, True), sym((4769, 7052), 'building', None)])
cluster('hummelbaugh', 'J. HUMMERBACH (Hummelbaugh)', [sym(det=7573, role='house', letter='W', cty=3580), sym(det=7572, role='building', letter='W', cty=13683)])
cluster('leister', 'M. LEISTER', [sym(det=6666, role='house', letter='W', cty=13528, anchor=True), sym(det=6672, role='barn', letter='W', cty=7153, anchor=True, note='NPS HSR: barn about 60 yd WEST of the house, matching this symbol lying west of the house symbol')])
cluster('bryan', 'BRYAN (Brien)', [sym(det=6445, role='house', letter='W', cty=4533, note='NPS: Warren shows house and barn 30 ft apart, the present buildings are 75 ft apart'), sym(det=6475, role='barn', letter='W', cty=5509)])
cluster('fry', 'M. FRY (Frey)', [sym(det=8139, role='building', letter='W'), sym(det=8156, role='building', letter='W'), sym(det=8147, role='building', letter='W')])
cluster('patterson', 'S. PATTERSON', [sym(det=8415, role='building', letter='W'), sym(det=8432, role='building', letter='W'), sym(det=8443, role='building', letter='W')])
cluster('jweikert', 'J. WEIKERT', [sym(det=8557, role='building', letter='W'), sym(det=8565, role='building', letter='W'), sym(det=8580, role='building', letter='W')])
cluster('culp', 'WM. CULP', [sym(det=4093, role='building', letter='W', cty=8971, note='nearest symbol to the surviving brick house outline (19 m); plate letter W conflicts with HABS brick, identification uncertain'), sym(det=4119, role='building', letter='W'), sym(det=4142, role='building', letter='S'),
                              sym(det=4188, role='building', letter='W'), sym(det=4182, role='building', letter='W')])
cluster('mcmillan', 'D. McMILLAN', [sym(det=5004, role='house', letter='W', cty=12743), sym(det=4979, role='building', letter='W'), sym(det=4890, role='building', letter='W')])
cluster('bliss', 'W. BLISS', [sym((4180, 5388), 'house', 'W'), sym((4170, 5466), 'barn', 'W')],
        'Burned by Union troops on 3 July 1863; never rebuilt (NPS)')
cluster('wentz', 'J. WENTZ', [sym(det=8330, role='house', letter='W'), sym(det=8325, role='building', letter='W'), sym(det=8302, role='building', letter='W')])
cluster('forney', 'J. FORNEY', [sym(det=1790, role='building', letter='W')])
cluster('hagy_beams', 'HAGY / BEAMS (McClean tenants)', [sym(det=2225), sym(det=2222), sym(det=2274), sym(det=2301)])
cluster('mclean', 'M. McLEAN', [sym((4163, 2206), 'house', 'W', 5437, True), sym((4154, 2267), 'barn', 'W', 7678, True)])
cluster('mcpherson', 'E. McPHERSON', [sym(det=2891, role='barn', letter='S', cty=11495, anchor=False, note='identity unresolved: every symbol of this farmstead lies about 50 m east of the position the georeference gives the surviving barn'), sym(det=2804, role='building', letter='W'), sym(det=2844, role='building', letter='W'), sym(det=2855, role='building'), sym(det=2880, role='building'), sym(det=2965, role='building', letter='S')])
cluster('almshouse', 'COUNTY ALMSHOUSE', [sym(detd=i) for i in (3320, 3332, 3373, 3404, 3397, 3438, 3447)] + [sym(px=(5385, 2879)), sym(px=(5361, 2863))])
