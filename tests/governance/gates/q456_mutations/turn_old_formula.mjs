// Defect for the Q05 test: the stage turns every block in the fixed shortest time (TURN_S = 25 s) whatever its size and speed (the old formula), so the far end of a long block moves faster than the documented urgent double quick (2.5146 m/s).
export function mutateStage(stage) {
  const orig = stage._step.bind(stage);
  stage._step = (cur, e) => { const r = orig(cur, e); return r && r.turnS != null ? { ...r, turnS: 25 } : r; };
}
