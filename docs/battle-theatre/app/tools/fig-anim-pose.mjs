// Pose the figure meshes with the ANIMATION part's baked clips (read-only use of src/anim3d and data/figures3d/skeleton.json): poseFromClip(meshes, clipId, t, { root, yaw }) returns finalized meshes skinned
// at clip time t. Used by the contact-sheet tool for the mounted trooper and the gun crew (replacing the earlier stand-in bend). node only.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { ClipLibrary } from '../src/anim3d/library.mjs'; import { sampleClip } from '../src/anim3d/clipdef.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), skeleton = JSON.parse(fs.readFileSync(path.join(here, '../data/figures3d/skeleton.json'), 'utf8'));
let LIB = null; export const midBones = () => skeleton.human.lod.mid.bones;
export const clipLib = () => (LIB ??= new ClipLibrary(skeleton));
export function skinMatrices(clipId, t, grip = null) {
  const lib = clipLib(), clip = lib.get(clipId), rig = clip.rig, fr = rig.newFrame(), pose = rig.newPose(), fk = rig.newFK(), M = new Float32Array(rig.n * 12);
  sampleClip(clip, clip.loop ? t % clip.dur : Math.min(t, clip.dur), fr); if (grip) { fr[rig.OFF_EXTRA + rig.X_GRIPL] = grip[0]; fr[rig.OFF_EXTRA + rig.X_GRIPR] = grip[1]; } rig.expandFrame(fr, pose); rig.fk(pose, fk); rig.skin(fk, M, null); return { M, extras: Array.from(fr.subarray(rig.OFF_EXTRA, rig.OFF_EXTRA + rig.NEXTRA)), clip };
}
// apply the skin matrices to finalized meshes (joints index the full human rig), then the rigid root transform (yaw about y, translation)
export function poseFromClip(meshes, clipId, t, { root = [0, 0, 0], yaw = 0, M = null, bones = null, grip = null } = {}) {
  const S = M ?? skinMatrices(clipId, t, grip).M, c = Math.cos(yaw), s = Math.sin(yaw);   // bones: for LOD1/LOD2 meshes (36-bone mid skeleton) the list of full-rig bone indices of the mid bones
  return meshes.map(m => {
    const pos = new Float32Array(m.pos.length), nrm = new Float32Array(m.nrm.length);
    for (let v = 0; v < m.nv; v++) {
      let px = 0, py = 0, pz = 0, nx = 0, ny = 0, nz = 0; const x = m.pos[v * 3], y = m.pos[v * 3 + 1], z = m.pos[v * 3 + 2], a = m.nrm[v * 3], b = m.nrm[v * 3 + 1], d = m.nrm[v * 3 + 2];
      for (let k = 0; k < 4; k++) { const w = m.weights[v * 4 + k]; if (w <= 0) continue; const q = (bones ? bones[m.joints[v * 4 + k]] : m.joints[v * 4 + k]) * 12;
        px += w * (S[q] * x + S[q + 1] * y + S[q + 2] * z + S[q + 3]); py += w * (S[q + 4] * x + S[q + 5] * y + S[q + 6] * z + S[q + 7]); pz += w * (S[q + 8] * x + S[q + 9] * y + S[q + 10] * z + S[q + 11]);
        nx += w * (S[q] * a + S[q + 1] * b + S[q + 2] * d); ny += w * (S[q + 4] * a + S[q + 5] * b + S[q + 6] * d); nz += w * (S[q + 8] * a + S[q + 9] * b + S[q + 10] * d); }
      const l = Math.hypot(nx, ny, nz) || 1; pos[v * 3] = px * c + pz * s + root[0]; pos[v * 3 + 1] = py + root[1]; pos[v * 3 + 2] = -px * s + pz * c + root[2]; nrm[v * 3] = (nx * c + nz * s) / l; nrm[v * 3 + 1] = ny / l; nrm[v * 3 + 2] = (-nx * s + nz * c) / l;
    }
    return { ...m, pos, nrm, rpos: m.rpos ?? m.pos };
  });
}
