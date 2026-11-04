"""Scope B, XII Corps (z): Geary's statement of when Kane took command, and the conflict-group joins for claims written with manual labels
(every group lists the members that give different values for the same event; a pair that prints the same clock time is not linked)."""
from xii_helpers import C, G, join, LABELS, GROUPS

ITEMS = [
    C('us-12c-2d-kane', 'position', 'OR27-1-R293', 'until General Kane assumed command on the morning of the 3d instant', 'Geary: Colonel Cobham commanded the Second Brigade throughout the campaign "until General Kane assumed command on the morning of the 3d instant"',
      'on the morning of the 3d instant', '07-03', place='Second Brigade', grp='kane_cmd',
      note='Kane (R302) and Cobham (R303) both print 6 a. m. on the morning of July 2 for Kane\'s arrival; Geary prints the 3d.'),
]


def _joins():
    for grp, labels in (
        ('dep_left_1d', ['xii_depart_left_slocum', 'xii_depart_left_williams', 'xii_depart_left_ruger', 'xii_depart_left_geary_1d']),
        ('dep_left_2d', ['xii_depart_left_geary']),
        ('art_open', ['xii_art_open_slocum', 'xii_art_open_williams', 'xii_art_open_ruger', 'xii_art_open_geary']),
        ('inf_start', ['xii_art_open_geary']),
        ('jul3_dur', ['xii_jul3_dur_williams', 'xii_jul3_dur_geary', 'xii_jul3_dur_wooster']),
        ('jul3_end', ['xii_jul3_end_slocum', 'xii_jul3_end_geary']),
        ('lockwood_arrival', ['xii_lockwood_arr_slocum', 'xii_lockwood_arr_williams', 'xii_lockwood_arr_lockwood', 'xii_lockwood_geary']),
        ('jul1_night_2d', ['xii_2d_jul1_night', 'xii_2d_jul1_night_williams', 'xii_2d_jul1_geary', 'xii_2d_jul1_hancock', 'xii_2d_jul1_slocum5']),
        ('corps_arr_jul1', ['xii_2d_jul1_geary', 'xii_2d_tt_depart_geary', 'xii_149ny_tt_depart']),
        ('tt_arr', ['xii_2d_tt_arr_geary']),
        ('depart_jul5', ['xii_depart_jul5_williams', 'xii_depart_jul5_slocum', 'xii_depart_jul5_geary', 'xii_depart_jul5_mcdougall']),
        ('gregg', ['xii_gregg_ruger', 'xii_gregg_grimes', 'xii_gregg_crane']),
        ('jul3_pm_center', ['xii_1b_jul3_pm_williams', 'xii_1b_jul3_pm_ruger']),
        ('recon_jul4', ['xii_recon_williams', 'xii_recon_ruger']),
        ('charge', ['xii_charge_ruger']),
        ('jul2_move_1d', ['xii_1d_jul2_move', 'xii_1d_jul2_move_williams', 'xii_1d_jul2_move_ruger', 'xii_1d_jul2_move_mcd']),
        ('jul2_morning_2d', ['xii_2d_jul2_move_geary', 'xii_2d_jul2_move']),
        ('kane_return_time', ['xii_kane_return_geary']),
        ('greene_start', ['xii_greene_att_geary']),
        ('jun29_place', ['xii_5ct_jun29_p1', 'xii_5ct_jun29_p2']),
    ):
        for lab in labels:
            if lab not in LABELS:
                raise KeyError('join: unknown label ' + lab)
        join(grp, *labels)
    for key in sorted(LABELS):
        if key.startswith('g_jun29_2d_depart_'):
            join('jun29_place', key)


_joins()
