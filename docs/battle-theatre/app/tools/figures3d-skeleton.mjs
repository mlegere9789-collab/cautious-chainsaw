// Writes data/figures3d/skeleton.json (the contract with the ANIMATION agent). node docs/battle-theatre/app/tools/figures3d-skeleton.mjs
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
import { buildSkeletonJson } from '../src/figures3d/skeleton.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), out = path.join(here, '../data/figures3d/skeleton.json');
const j = buildSkeletonJson(); const body = JSON.stringify(j, null, 1); j.content_sha256 = crypto.createHash('sha256').update(body).digest('hex');
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(j, null, 1) + '\n');
console.log('skeleton.json: human', j.human.bones.length, 'bones (mid', j.human.lod.mid.count + '), horse', j.horse.bones.length, ', gun', j.gun.bones.length, ', sha256', j.content_sha256.slice(0, 16));
