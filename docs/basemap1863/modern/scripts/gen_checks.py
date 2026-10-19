"""Write results/checks.json: the eight independent checks of this layer, each read from the result file that holds it."""
import json, os
M = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
R = lambda n: json.load(open(os.path.join(M, 'results', n), encoding='utf8'))
reg, cv, inv, vis, inp, cl, mon, ter, vint = R('registration.json'), R('detect_cv.json'), R('inventory.json'), R('visual_review.json'), R('inpaint_test.json'), R('closedloop.json'), R('monuments.json'), R('terrain_changes.json'), R('vintages.json')
a = inp['aggregate_mean']; c = cl['mean_over_sites']
cc = inv['road_cross_check']
checks = {
 '1 registration (vectors vs photograph)': f"{reg['n_buildings']} Adams outlines fitted to 2013 image edges: median shift ({reg['global_median_dx_m']:+.1f}, {reg['global_median_dy_m']:+.1f}) m, spread {reg['global_mad_dx_m']:.1f} m; masks grown 1 m. results/registration.json",
 '2 detector, spatial hold-out': f"pavement recall {cv['recall']['pavement']:.2f} / precision {cv['precision']['pavement']:.2f}; roof {cv['recall']['roof']:.2f} / {cv['precision']['roof']:.2f}; against map-derived labels only. results/detect_cv.json",
 '3 mask drawn on the photograph, looked at': f"{vis['round_1_before_spectral_gate']['windows_seen']} windows before and {vis['round_2_after_gate']['windows_seen']} after the spectral gate; the first round exposed shadow false hits and over-wide road masks, fixed, second round clean apart from ragged 1-2 m edges. results/visual_review.json, previews/review_*.jpg",
 '4 precision of unmapped detections, by eye': f"{vis['unmapped_detections_precision']['confirmed_modern_surface_or_roof']} of {vis['unmapped_detections_precision']['n']} confirmed, {vis['unmapped_detections_precision']['engineered_or_modern_but_not_pavement_or_roof']} engineered, {vis['unmapped_detections_precision']['false_bare_soil_or_stream_gravel']} false. results/visual_review.json",
 '5 seams of the removal, 20 real masks': f"seam_ratio mean: telea {a['telea']['seam_ratio']}, ns {a['ns']['seam_ratio']}, exemplar {a['exemplar']['seam_ratio']} (1.0 = boundary as busy as ordinary ground); sites above 1.3: {a['telea']['seam_visible_sites(>1.3)']}, {a['ns']['seam_visible_sites(>1.3)']}, {a['exemplar']['seam_visible_sites(>1.3)']}. results/inpaint_test.json",
 '6 removal vs truth on clean ground': f"grain ratio (Laplacian variance, 1.0 = real): telea {a['telea']['truth_tex']}, ns {a['ns']['truth_tex']}, exemplar {a['exemplar']['truth_tex']}; gradient-histogram distance (lower = more like real): {a['telea']['truth_js']}, {a['ns']['truth_js']}, {a['exemplar']['truth_js']}; PSNR dB {a['telea']['truth_psnr']}, {a['ns']['truth_psnr']}, {a['exemplar']['truth_psnr']} (PSNR rewards blur).",
 '7 closed loop: does a detector still see modern surface in the filled mask': f"mean P(modern) inside masks: before {c['before']}, telea {c['telea']}, ns {c['ns']}, exemplar {c['exemplar']}, untouched ground {c['untouched_ground']}; share of mask pixels above 0.5: {c['share_gt0p5']}. results/closedloop.json",
 '8 source cross-consistency': f"OSM vs Adams centre lines: {cc['adams_centerline.json']['osm_covered_fraction']:.0%} of Adams length within 15 m of OSM; TIGER local {cc['tiger_local.json']['osm_covered_fraction']:.0%}; monuments Wikipedia vs OSM median offset {inv['monuments']['wiki_osm_offset_median_m']} m (p90 {inv['monuments']['wiki_osm_offset_p90_m']} m) over {inv['monuments']['wikipedia_matched_to_osm_within_15m']} matched; quad-edge seams in the 2013 mosaic {vint['2013']['quad_edge_luminance_step_median']} vs {vint['2013']['random_line_step_median']} on random lines.",
}
json.dump(checks, open(os.path.join(M, 'results', 'checks.json'), 'w', encoding='utf8'), indent=1)
for k, v in checks.items(): print(k, '->', v[:150])
