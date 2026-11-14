"""Write docs/battle-theatre/life/evidence/poses.json: which existing clips show soldier work and routine, and the poses that no clip shows.

    python3 -I tools/bt/life/build_poses.py

A pose is listed because an activity of the contract (subkinds in contract.json) has no clip that shows it.  Listing a pose claims nothing
about 1863: whether the activity happened, where and by whom is the business of the evidence rows (a row names the pose in `pose_needed`).
A pose is authored only when at least one evidence row of any tier names it (`demand` is counted from the rows by the validator's --all run
of this tool's second mode: `python3 -I tools/bt/life/build_poses.py --demand`).  Props use the rig's four prop bones (clips.json rig.core:
prop_long, prop_sword, prop_pole, prop_instr).
"""
import os, sys, json, glob, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from life_lib import *

# id, name, serves (subkinds), nearest existing clip, prop (bone: item), the pose, priority
P = [
 # ---- labour
 ('POSE-L01', 'pick_swing', 'earth_parapet rifle_pits gun_pit_or_epaulement road_cut_or_improved burial_party', 'dig_shovel', 'prop_pole: pick', 'both hands on the pick helve, overhead swing and strike, stooped recovery; loop', 'P2'),
 ('POSE-L02', 'shovel_throw_up', 'earth_parapet gun_pit_or_epaulement rifle_pits', 'dig_shovel', 'prop_pole: shovel', 'standing in the ditch, load the shovel and throw the earth up and forward onto the parapet; loop', 'P1'),
 ('POSE-L03', 'earth_tamp', 'earth_parapet gun_pit_or_epaulement', 'dig_shovel', 'prop_pole: spade or rammer', 'stand on the parapet and tamp or beat the earth with the flat of the spade or a rammer; loop', 'P2'),
 ('POSE-L04', 'sod_cut_lay', 'gun_pit_or_epaulement earth_parapet', 'dig_shovel', 'prop_pole: spade', 'cut a sod with the spade, lift it, lay it grass down on the face of the work; loop', 'P2'),
 ('POSE-L05', 'log_carry_two', 'log_works barricade_street bridge_repaired', 'march_carry_rail', 'prop_long: log (two men)', 'two men carry a log or stringer on the shoulders or between them on handspikes, in step; loop', 'P1'),
 ('POSE-L06', 'log_roll_handspike', 'log_works gun_pit_or_epaulement', 'lay_stone', 'prop_long: handspike', 'heave a log along the ground with a handspike, step and re-seat the bar; loop', 'P2'),
 ('POSE-L07', 'head_log_set', 'log_works breastwork_infantry', 'lay_stone', 'prop_long: log', 'lift a log from the ground to chest height and set it on top of the work; one shot and loop', 'P1'),
 ('POSE-L08', 'rail_pull_fence', 'fence_taken_down rail_barricade', 'march_carry_rail', 'prop_long: rail', 'lift a rail out of a zigzag fence, throw it down, take the next; loop', 'P1'),
 ('POSE-L09', 'rail_stack', 'rail_barricade breastwork_infantry', 'lay_stone', 'prop_long: rail', 'lay rails crosswise in a pile, stooped placing, step back; loop', 'P1'),
 ('POSE-L10', 'stone_carry', 'stone_works wall_improved', 'lay_stone', 'prop_pole: stone', 'carry a stone in both hands at the waist or chest over rough ground; loop', 'P1'),
 ('POSE-L11', 'stone_roll_pry', 'stone_works', 'lay_stone', 'prop_long: bar', 'pry or roll a boulder with a bar or handspike, lean and release; loop', 'P2'),
 ('POSE-L12', 'saw_crosscut_pair', 'log_works abatis_or_slashing', 'chop_axe', 'prop_long: crosscut saw (two men)', 'two men draw a crosscut saw alternately through a trunk, kneeling or stooped; loop', 'P2'),
 ('POSE-L13', 'trunk_trim_limbs', 'abatis_or_slashing log_works', 'chop_axe', 'prop_pole: axe', 'stooped over a felled trunk, trim the limbs with short axe strokes, step along; loop', 'P2'),
 ('POSE-L14', 'abatis_drag_place', 'abatis_or_slashing', 'march_carry_rail', 'prop_long: tree top', 'drag a tree top or branch by the butt, set it with the points outward; loop', 'P2'),
 ('POSE-L15', 'stake_drive_maul', 'works_layout gun_pit_or_epaulement', 'chop_axe', 'prop_pole: maul and stake', 'hold a stake upright, strike it with the maul; loop', 'P2'),
 ('POSE-L16', 'line_pace_officer', 'works_layout', 'officer_point', 'prop_sword: sword at the side', 'an officer walks the line with measured steps and points out the trace to the men told off; loop', 'P1'),
 ('POSE-L17', 'plank_pry_loophole', 'loopholing', 'chop_axe', 'prop_pole: bar or axe', 'pry a board off a wall or cut through it at head height; loop', 'P2'),
 ('POSE-L18', 'carry_bulky_pair', 'barricade_street', 'carry_litter_front', 'prop_long: bulky object (two men)', 'two men carry a bulky object (barrel, box, wagon box) between them; loop', 'P2'),
 ('POSE-L19', 'pontoon_chess_lay', 'bridge_laid bridge_repaired battery_platform', 'lay_stone', 'prop_long: plank', 'stoop on a bridge or platform and lay a plank across the stringers, step forward; loop', 'P2'),
 ('POSE-L20', 'pontoon_pole_boat', 'bridge_laid ford_improved', 'march_carry_rail', 'prop_long: pole or oar', 'stand in a boat and set a pole or pull an oar; loop', 'P2'),
 ('POSE-L21', 'torch_set_fire', 'bridge_destroyed', 'stand_picket', 'prop_pole: torch or straw bundle', 'stoop, set a bundle of straw alight and push it under a structure, step back; one shot', 'P2'),
 ('POSE-L24', 'fire_beat_bucket_line', 'fire_fighting', 'orderly_water', 'prop_instr: bucket; prop_pole: wet blanket or branch', 'pass buckets hand to hand along a line, or beat flames with a wet blanket or a branch; loop', 'P2'),
 ('POSE-L22', 'tool_bundle_carry', 'tools_issue_or_carry', 'march_carry_rail', 'prop_long: bundle of spades and axes', 'carry a bundle of tools on the shoulder; loop', 'P1'),
 ('POSE-L23', 'tool_wagon_hand_out', 'tools_issue_or_carry', 'stand_rest', 'prop_pole: spade handed over', 'at a wagon, take tools from the bed and hand them down the line; loop', 'P2'),
 # ---- routine
 ('POSE-R01', 'sit_ground_eat', 'meal ration_issue', 'eat_hardtack', 'prop_instr: cup; food in hand', 'seated on the ground, knees up, hand to mouth, cup beside; loop', 'P1'),
 ('POSE-R02', 'boil_coffee_kneel', 'cooking meal', 'cook_stir', 'prop_instr: tin cup on a stick', 'kneel at a small fire and hold a tin cup over the flame, watch it, lift it; loop', 'P1'),
 ('POSE-R03', 'fry_pan_hold', 'cooking', 'cook_stir', 'prop_pole: frying pan or stick', 'crouch at a fire holding a pan over the coals, turn the food; loop', 'P1'),
 ('POSE-R04', 'kettle_carry_pole', 'cooking water_carrying', 'orderly_water', 'prop_long: pole with kettles', 'carry a camp kettle by the bail, or two kettles on a pole between two men; loop', 'P2'),
 ('POSE-R05', 'canteen_bundle_carry', 'water_carrying', 'orderly_water', 'prop_instr: canteens by their slings', 'walk with a bundle of canteens hanging from both hands and shoulders; loop', 'P1'),
 ('POSE-R06', 'spring_draw_kneel', 'water_carrying washing_bathing', 'drink_cup', 'prop_instr: canteen or bucket', 'kneel or stoop at a spring or stream, fill the vessel, rise; loop', 'P1'),
 ('POSE-R07', 'well_pump_work', 'water_carrying', 'orderly_water', 'prop_pole: pump handle or well bucket', 'work a pump handle or draw a bucket at a well; loop', 'P2'),
 ('POSE-R08', 'ration_sack_carry', 'ration_issue', 'march_carry_rail', 'prop_long: sack or box', 'carry a sack or box of bread on the shoulder or back; loop', 'P1'),
 ('POSE-R09', 'ration_hand_out', 'ration_issue', 'stand_rest', 'prop_pole: box lid', 'stand at a box or barrel and hand out issue to men in line; loop', 'P1'),
 ('POSE-R10', 'beef_cut_cleaver', 'ration_issue forage_requisition', 'chop_axe', 'prop_pole: cleaver or axe', 'cut meat on a block or a log with a cleaver; loop', 'P2'),
 ('POSE-R11', 'cattle_drive_walk', 'forage_requisition ration_issue', 'march_quick_time_atwill', 'prop_pole: switch', 'walk beside driven cattle with a switch; loop', 'P2'),
 ('POSE-R12', 'sleep_back', 'sleep_bivouac', 'sleep_side', 'prop_pole: hat or rifle by the side', 'lie on the back under a blanket, hat over the face, breathing; loop', 'P1'),
 ('POSE-R13', 'sleep_pair_blanket', 'sleep_bivouac', 'sleep_side', 'prop_pole: shared blanket', 'two men lie close under one blanket, back to back; loop', 'P2'),
 ('POSE-R14', 'doze_sit_tree', 'sleep_bivouac rest_halt', 'stand_rest', 'prop_long: musket across the knees', 'sit with the back against a tree or a knapsack, head dropped, doze; loop', 'P1'),
 ('POSE-R15', 'lie_prop_elbow', 'rest_halt idle_camp_life', 'sleep_side', 'none', 'lie propped on one elbow, head turning as if talking; loop', 'P1'),
 ('POSE-R16', 'sit_ground_idle', 'rest_halt idle_camp_life', 'sit_fire', 'none', 'sit on the ground, arms on the knees, shift weight and look about; loop', 'P1'),
 ('POSE-R17', 'fall_out_roadside_rest', 'rest_halt foot_care_shoes', 'stand_rest', 'prop_long: musket on the ground', 'sit or lie against a fence or bank at the roadside after a halt; loop', 'P1'),
 ('POSE-R18', 'stack_arms', 'camp_made rest_halt', 'arms_order_from_shoulder', 'prop_long: musket, stack of three', 'set three muskets upright, lock the bayonets or swivels together, step back; one shot', 'P1'),
 ('POSE-R19', 'pitch_tent_pair', 'camp_made', 'lay_stone', 'prop_pole: tent poles and canvas', 'two men raise a small tent: spread the cloth, set the poles, tie down; one shot', 'P2'),
 ('POSE-R20', 'blanket_roll_wrap', 'sleep_bivouac camp_made', 'sleep_side', 'prop_pole: blanket roll', 'unroll a blanket roll or roll it up and sling it; one shot', 'P2'),
 ('POSE-R21', 'firewood_armful_carry', 'cooking camp_made', 'march_carry_rail', 'prop_long: wood or rails', 'carry an armful of wood or rails to the fire; loop', 'P1'),
 ('POSE-R22', 'fire_tend_poke', 'cooking idle_camp_life', 'sit_fire', 'prop_pole: stick', 'squat at a camp fire, push a stick into it and feed wood; loop', 'P1'),
 ('POSE-R23', 'letter_write_sit', 'idle_camp_life', 'sit_fire', 'prop_pole: pencil and paper on the knee', 'sit and write on the knee, pause, write; loop', 'P2'),
 ('POSE-R24', 'read_sit', 'idle_camp_life', 'sit_fire', 'prop_pole: paper or book', 'sit and hold a paper before the face, turn it; loop', 'P2'),
 ('POSE-R25', 'pipe_smoke_sit', 'idle_camp_life', 'sit_fire', 'prop_pole: pipe', 'sit, pipe to the mouth, take it away, exhale; loop', 'P2'),
 ('POSE-R26', 'rifle_clean_sit', 'idle_camp_life ammunition_issue', 'sit_fire', 'prop_long: musket across the knees', 'sit and wipe the lock and barrel with a rag, look along it; loop', 'P2'),
 ('POSE-R27', 'cartridge_box_fill', 'ammunition_issue', 'stand_rest', 'prop_pole: cartridge packets', 'at a crate, take packets, fill the cartridge box, close the flap; loop', 'P1'),
 ('POSE-R28', 'ammo_box_carry_pair', 'ammunition_issue', 'carry_litter_front', 'prop_long: ammunition box (two men)', 'two men carry an ammunition box by its rope handles; loop', 'P1'),
 ('POSE-R29', 'shoe_off_foot_inspect', 'foot_care_shoes', 'sit_fire', 'prop_pole: shoe', 'sit, pull off a shoe, look at the foot and the sole; loop', 'P2'),
 ('POSE-R30', 'wash_face_basin', 'washing_bathing', 'drink_cup', 'prop_instr: basin or cupped hands', 'stoop at a basin or stream, wash face and hands, dry; loop', 'P2'),
 ('POSE-R31', 'bathe_stream_wade', 'washing_bathing', 'march_route_step_atwill', 'none', 'stand in a creek to the knee, scoop and splash water over the body; loop', 'P2'),
 ('POSE-R32', 'laundry_wring_scrub', 'washing_bathing', 'cook_stir', 'prop_pole: shirt', 'scrub cloth on a board or stone, wring it; loop', 'P2'),
 ('POSE-R33', 'sentry_walk_beat', 'guard_duty picket_duty', 'march_common_time_shoulder', 'prop_long: musket at the shoulder', 'pace a beat at common time, turn at each end, look along the line; loop', 'P1'),
 ('POSE-R34', 'sentry_challenge_port', 'guard_duty picket_duty', 'stand_picket', 'prop_long: musket at the port', 'bring the musket to the port, face the sound, hold; one shot', 'P2'),
 ('POSE-R35', 'picket_tree_kneel_watch', 'picket_duty', 'cover_tree_stand_L', 'prop_long: musket', 'kneel behind a tree or rail, head turning to observe, not firing; loop', 'P1'),
 ('POSE-R36', 'rider_halt_watch', 'picket_duty guard_duty', 'rider_command', 'prop_sword: carbine on the thigh', 'sit a halted horse, head turning to watch, horse shifting its weight; loop', 'P1'),
 ('POSE-R37', 'grave_dig_shallow', 'burial_party', 'dig_shovel', 'prop_pole: shovel', 'dig and throw earth in a shallow trench beside a body on the ground; loop', 'P1'),
 ('POSE-R38', 'body_carry_blanket_two', 'burial_party', 'carry_litter_front', 'prop_long: blanket with a body (two men)', 'two men carry a body in a blanket by its corners; loop', 'P1'),
 ('POSE-R39', 'body_lower_trench', 'burial_party', 'lie_down', 'prop_long: blanket with a body', 'lower a body into a trench by the blanket, step back; one shot', 'P1'),
 ('POSE-R40', 'grave_board_set', 'burial_party', 'dig_shovel', 'prop_pole: headboard and mallet', 'set a headboard at the head of the grave and tap it in; one shot', 'P2'),
 ('POSE-R41', 'hat_off_stand_bare', 'burial_party religious_service', 'stand_rest', 'prop_pole: hat held at the chest', 'stand bareheaded, hat at the chest, head bowed; loop', 'P1'),
 ('POSE-R42', 'chaplain_read_stand', 'religious_service', 'officer_speak', 'prop_pole: book', 'stand with a book, read, look up at the men; loop', 'P2'),
 ('POSE-R43', 'fife_play', 'music_calls', 'drummer_beat', 'prop_instr: fife', 'stand and play a fife, fingers moving; loop', 'P2'),
 ('POSE-R44', 'band_brass_play', 'music_calls', 'bugler_call', 'prop_instr: brass instrument', 'stand and play a brass instrument over the shoulder or in front; loop', 'P2'),
 ('POSE-R45', 'roll_call_stand_paper', 'roll_call', 'officer_speak', 'prop_pole: roll', 'stand before a rank, read a name from a paper, tick it; loop', 'P2'),
 ('POSE-R46', 'orders_read_stand', 'roll_call', 'officer_speak', 'prop_pole: paper', 'stand before the assembled men and read an order aloud; loop', 'P2'),
 ('POSE-R47', 'horse_feed_nosebag', 'horse_care', 'horse_holder', 'prop_pole: nosebag', 'fit a nosebag over the horse\'s head, stroke its neck; loop (horse head down on its own rig)', 'P1'),
 ('POSE-R48', 'horse_water_lead', 'horse_care water_carrying', 'horse_walk', 'prop_pole: reins', 'lead horses to a stream and let them drink, head down; loop (horse head down on its own rig)', 'P1'),
 ('POSE-R49', 'horse_groom_curry', 'horse_care', 'horse_holder', 'prop_pole: curry comb', 'stand at the horse\'s side and curry its flank with short strokes; loop', 'P2'),
 ('POSE-R50', 'saddle_girth_tighten', 'horse_care', 'horse_holder', 'prop_pole: girth strap', 'lift the stirrup, reach under, draw the girth tight; one shot', 'P2'),
 ('POSE-R51', 'team_harness_fit', 'horse_care', 'horse_holder', 'prop_pole: collar and trace', 'lift the collar over the horse\'s head and buckle the traces; one shot', 'P2'),
 ('POSE-R52', 'horse_graze', 'horse_care rest_halt', 'horse_idle', 'none', 'the horse stands with its head down eating from the ground, tail swishing; loop (horse rig)', 'P1'),
 ('POSE-R53', 'ford_wade_carry', 'water_carrying rest_halt', 'march_route_step_atwill', 'prop_long: musket and cartridge box held high', 'wade a stream to the thigh, weapon and box held above the water; loop', 'P2'),
 ('POSE-R54', 'wagon_driver_seat', 'ration_issue forage_requisition', 'rider_walk', 'prop_pole: whip or reins', 'sit on a wagon seat with the reins, the team walking; loop (wagon rig)', 'P2'),
 ('POSE-R55', 'wagon_unload_barrel', 'ration_issue', 'march_carry_rail', 'prop_long: barrel or box', 'lift a barrel or box from a wagon tail and carry it away; loop', 'P2'),
]
LIMITS = {
    'dig_shovel': 'spade only; one digging motion for earth work, burial and gun pits (no pick, no throwing up, no tamping)',
    'chop_axe': 'axe only, one chopping motion (no saw, no trimming limbs, no splitting)',
    'march_carry_rail': 'a single man with a rail on the shoulder; walks at 0.85 m/s (no two-man carry, no throwing down)',
    'lay_stone': 'lift and set one stone; no carrying, no prying; also the nearest clip for stacking rails and logs',
    'sit_fire': 'seated at a fire, hands to the warmth, head turning (no tending, no eating, no writing)',
    'cook_stir': 'standing or crouched stirring one pot with a ladle (no frying, no coffee, no kettle carry)',
    'drink_cup': 'cup or canteen to the mouth, one shot, not looped (no filling a vessel)',
    'eat_hardtack': 'hand to mouth and chewing (posture not stated by the clip name: check before use for a seated meal)',
    'sleep_side': 'sleeping on the side, breathing (no supine, no sitting asleep, no pairs)',
    'stand_picket': 'standing alert, head scanning, rifle at order arms (no pacing, no challenge, no kneeling)',
    'stand_rest': 'rest or at ease; documented in the drill manual (the standing rest, not a seated rest)',
    'orderly_water': 'orderly carrying a bucket (hospital role); usable as a stand-in for a water carry until a canteen carry exists',
    'drummer_beat': 'drummer beating', 'bugler_call': 'bugle call',
}
ACTIVITY_CLIPS = ['dig_shovel', 'chop_axe', 'march_carry_rail', 'lay_stone', 'sit_fire', 'cook_stir', 'drink_cup', 'eat_hardtack', 'sleep_side', 'stand_picket', 'stand_rest',
                  'orderly_water', 'drummer_beat', 'bugler_call', 'horse_holder', 'officer_point', 'officer_speak', 'color_stand']


def main():
    clips = clip_ids()
    subk = load_json(CONTRACT_PATH)
    allsub = set(subk['subkinds']['labour']) | set(subk['subkinds']['routine'])
    cov = []
    for cid in ACTIVITY_CLIPS:
        c = clips.get(cid)
        if not c:
            continue
        cov.append({'id': cid, 'family': c['family'], 'label': c['label'], 'loop': c['loop'], 'durS': c['durS'], 'tier': c['tier'], 'gap': c.get('gap'), 'role': c.get('role'),
                    'props': c.get('props'), 'variants': sorted(k for k in clips if k.startswith(cid + '~')) and len([k for k in clips if k.startswith(cid + '~')]) or 0,
                    'covers': sorted(k for k, v in subk['subkind_activity_hint'].items() if cid in v), 'limits': LIMITS.get(cid, '')})
    missing = []
    for pid, name, serves, nearest, prop, text, prio in P:
        sv = serves.split()
        bad = [s for s in sv if s not in allsub]
        assert not bad, (pid, bad)
        assert nearest in clips, (pid, nearest)
        missing.append({'id': pid, 'name': name, 'serves': sv, 'kind': 'labour' if pid.startswith('POSE-L') else 'routine', 'nearest_clip': nearest, 'prop': prop,
                        'pose': text, 'priority': prio, 'status': 'needed', 'gap': 'G-ANIM-09', 'evidence_rows': None})
    uncovered = sorted(s for s in allsub if not s.startswith('other_') and not any(s in m['serves'] for m in missing) and not any(s in c['covers'] for c in cov))
    doc = {'_doc': ('Clips that show soldier work and routine, and the poses no clip shows (tools/bt/life/build_poses.py). Listing a pose claims nothing about 1863: the evidence rows '
                    'say what was done, where and by whom. P1 = an activity the plan or the record already names or that every camp scene needs; P2 = needed when a row names it. '
                    'A pose is authored only when at least one evidence row names it in pose_needed (demand counted by build_poses.py --demand).'),
           'schema': 'life-poses-1', 'clips_file': 'docs/battle-theatre/app/data/anim3d/clips.json', 'rig_props': ['prop_long', 'prop_sword', 'prop_pole', 'prop_instr'],
           'clip_count': len(clips), 'activity_clips': cov, 'missing_poses': missing,
           'subkinds_without_any_clip_or_pose': uncovered,
           'note_horse_and_wagon': 'poses marked (horse rig) or (wagon rig) need an animal or vehicle clip of the figures workstream as well as the man; request note, not built here'}
    dump_json(POSES_PATH, doc)
    print('poses: %d missing, %d activity clips; subkinds with neither: %s' % (len(missing), len(cov), uncovered))


def demand():
    """count how many evidence rows name each pose (rows of every group file)"""
    doc = load_json(POSES_PATH)
    cnt = collections.Counter()
    for g in glob.glob(os.path.join(EVID, '*.jsonl')):
        for ln, line in read_jsonl(g):
            try:
                r = json.loads(line)
            except Exception:
                continue
            if isinstance(r, dict) and r.get('pose_needed'):
                cnt[r['pose_needed']] += 1
    for m in doc['missing_poses']:
        m['evidence_rows'] = cnt.get(m['id'], 0)
    dump_json(POSES_PATH, doc)
    print('demand counted:', sum(cnt.values()), 'rows name a pose')


if __name__ == '__main__':
    if '--demand' in sys.argv:
        demand()
    else:
        main()
