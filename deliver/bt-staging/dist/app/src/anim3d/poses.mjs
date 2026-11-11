// Named base poses (Spec presets) shared by the clip authors. Distances in metres, angles in degrees; positions are in the root frame (+x left, +y up, +z forward) unless the pose sets the rifle frame weight
// `rfr` = 1, in which case the rifle position is in the CHEST frame (origin at the spine3 joint, axes of the chest). `rref` names the point of the rifle that `rp` locates (metres from the butt toe).
// Each pose cites the drill paragraph it encodes (Hardee 1861 "School of the Soldier, Part II" = H.S.S.; Casey 1862 = C.S.S.); coordinates are the author's reading of the printed relations
// ("right hand embracing the guard, right arm nearly straight"): tier INFERRED (the manuals give relations, not coordinates).
import { Spec, PROPS } from './figure-pose.mjs';

export const STANCE = { footX: 0.092, ankleY: 0.085, footZ: -0.012 };
const R = PROPS.rifle;

export function attention(spec = new Spec()) { // "position of the soldier": heels together, toes out (H.S.S. school of the soldier part I, 60 degrees between the feet)
  spec.reset();
  spec.set('fl', STANCE.footX, STANCE.ankleY, STANCE.footZ).set('fr', -STANCE.footX, STANCE.ankleY, STANCE.footZ).set('fle', 0, 28, 0).set('fre', 0, -28, 0).set('lcont', 1).set('rcont', 1);
  spec.set('lhp', 0.245, 0.83, 0.02).set('rhp', -0.245, 0.83, 0.02);
  spec.set('rp', -0.30, 0.2, 0.15).set('ra', 0, 0, 0).set('bp', 0.17, 0.92, 0.02);
  return spec;
}
// shoulder arms (H.S.S. paras 139-142 / 145-146 / 154-155): the piece vertical at the right shoulder, rammer to the front, right hand embracing the guard, right arm nearly straight, left hand dropped to the side
export function shoulderArms(spec = new Spec()) {
  attention(spec);
  spec.set('rp', -0.215, 0.88, 0.07).set('rref', R.guard).set('rfr', 0).set('ra', 1.5, 0, 0).set('rhwa', 1).set('rhga', R.guard).set('rhe', 0, 0, 0).set('rep', -0.25, -0.3, -1);
  spec.set('lhwa', 0).set('lhp', 0.245, 0.83, 0.02);
  return spec;
}
// order arms (paras 147-149): butt on the ground at the toe of the right foot, muzzle about two inches from the right shoulder, right hand low on the barrel, piece perpendicular
export function orderArms(spec = new Spec()) {
  attention(spec);
  spec.set('rp', -0.15, 0.86, 0.14).set('rref', 0.86).set('rfr', 0).set('ra', 0.5, 0, 0).set('rhwa', 1).set('rhga', 0.86).set('rhe', 0, 0, 0).set('rep', -0.25, -0.3, -1);
  spec.set('lhwa', 0).set('lhp', 0.245, 0.83, 0.02);
  return spec;
}
// right shoulder shift (paras 210-211): the piece on the right shoulder, lock plate up, the right hand on the butt, muzzle elevated, left hand at the side
export function rightShoulderShift(spec = new Spec()) {
  attention(spec);
  spec.set('rp', -0.21, 1.07, -0.30).set('rref', 0.03).set('rfr', 0).set('ra', 42, 0, 0).set('rhwa', 1).set('rhga', 0.03).set('rhe', 0, 0, 0).set('rep', -0.9, 0.1, -0.2);
  spec.set('lhwa', 0).set('lhp', 0.245, 0.83, 0.02);
  return spec;
}
// arms at will / route step carry: the piece loosely on the shoulder, the right hand steadying it near the balance
export function armsAtWill(spec = new Spec()) {
  attention(spec);
  spec.set('rp', -0.23, 1.10, 0.06).set('rref', 0.65).set('rfr', 0).set('ra', 22, 0, 0).set('rhwa', 1).set('rhga', 0.65).set('rep', -0.4, -0.3, -0.9);
  spec.set('lhwa', 0).set('lhp', 0.25, 0.85, 0.02);
  return spec;
}
// trail arms (paras 197-198): muzzle inclined to the front, butt to the rear about four inches off the ground, right hand supported at the hip
export function trailArms(spec = new Spec()) {
  attention(spec);
  spec.set('rp', -0.20, 0.95, 0.12).set('rref', 0.85).set('rfr', 0).set('ra', 12, 0, 0).set('rhwa', 1).set('rhga', 0.85).set('rhe', 0, 0, 0).set('rep', -0.4, -0.3, -1);
  spec.set('lhwa', 0).set('lhp', 0.245, 0.83, 0.02);
  return spec;
}
// the running carry (double quick / the run): the piece trailed nearly level in the right hand at its balance (plausible-procedural: the manuals prescribe trail arms only as a drill position)
export function runCarry(spec = new Spec()) {
  attention(spec);
  spec.set('rp', -0.22, 0.98, 0.10).set('rref', 0.70).set('rfr', 0).set('ra', 62, 0, 0).set('rhwa', 1).set('rhga', 0.70).set('rep', -0.4, -0.3, -1);
  spec.set('lhwa', 0).set('lhp', 0.245, 0.83, 0.02);
  return spec;
}
// charge bayonet (paras 193-194): half face right, the piece brought down, barrel uppermost, left elbow against the body, right hand at the small of the stock against the hip, point of the bayonet as high as the eye
export function chargeBayonet(spec = new Spec()) {
  attention(spec);
  spec.set('pelE', 0, -20, 0).set('spE', 0, -18, 0);
  spec.set('fr', -0.19, STANCE.ankleY, -0.22).set('fre', 0, -60, 0).set('fl', 0.10, STANCE.ankleY, 0.06).set('fle', 0, 8, 0);
  spec.set('rp', -0.15, -0.20, 0.12).set('rref', R.wrist).set('rfr', 1).set('ra', 66, 38, 0).set('rhwa', 1).set('rhga', R.wrist).set('rep', -0.5, -0.4, -1);
  spec.set('lhwa', 1).set('lhga', 0.70).set('lep', 0.3, -0.6, -1);
  return spec;
}
// ready (paras 171-173): half face right, right foot behind at a right angle, piece in both hands, butt below the right forearm, muzzle at eye height, left elbow against the side, right thumb on the cock
export function ready(spec = new Spec()) {
  attention(spec);
  spec.set('pelE', 0, -20, 0).set('spE', 0, -18, 0);
  spec.set('fr', -0.19, STANCE.ankleY, -0.22).set('fre', 0, -60, 0).set('fl', 0.10, STANCE.ankleY, 0.06).set('fle', 0, 8, 0);
  spec.set('rp', -0.17, -0.12, 0.10).set('rref', R.wrist).set('rfr', 1).set('ra', 55, 42, 0).set('rhwa', 1).set('rhga', R.wrist).set('rep', -0.6, -0.5, -1);
  spec.set('lhwa', 1).set('lhga', 0.72).set('lep', 0.25, -0.6, -1);
  return spec;
}
// aim (para 181): butt against the right shoulder, left elbow down, right elbow as high as the shoulder, head inclined on the butt, right eye to the sight
export function aim(spec = new Spec()) {
  ready(spec);
  spec.set('rp', -0.15, 0.17, -0.04).set('rref', 0).set('rfr', 1).set('ra', 88, 41, 0).set('rhga', R.wrist).set('lhga', 0.72).set('rep', -1, 0.2, -0.2).set('lep', 0.15, -1, -0.4).set('hdE', 5, -34, 8).set('nkE', 4, -10, 3).set('spE', 3, -22, 0);
  return spec;
}
