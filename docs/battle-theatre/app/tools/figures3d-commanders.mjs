// Writes data/figures3d/commanders.json (the named-commander registry, OA04 / EG-FIG-0004). node docs/battle-theatre/app/tools/figures3d-commanders.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { commanderRegistry, COMMANDER_CARD, COMMANDER_REGISTER } from '../src/figures3d/commanders.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), BT = path.join(here, '..', '..');
const specs = JSON.parse(fs.readFileSync(path.join(BT, 'kit', 'kit_specs.json'), 'utf8'));
const out = { schema: 'figures3d-commanders-1', note: 'Every named commander is addressable and marked; none has an individual model (EG-FIG-0004, owner decision pending). Tiers are the kit effective tiers; nothing is promoted.', register: COMMANDER_REGISTER, card: COMMANDER_CARD, commanders: commanderRegistry(specs) };
fs.writeFileSync(path.join(here, '..', 'data', 'figures3d', 'commanders.json'), JSON.stringify(out, null, 1) + '\n'); console.log('wrote commanders.json,', out.commanders.length, 'entries');
