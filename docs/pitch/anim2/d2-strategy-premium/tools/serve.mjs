// tools/serve.mjs - serves docs/pitch/anim2 on 127.0.0.1 so the built page finds the basemap tiles at ../../basemap/assets/.   node tools/serve.mjs [--port=9860]   (Ctrl+C stops it)
import { startServer, args } from './lib.mjs';
const port = +(args.port || 9860); await startServer(port);
console.log(`http://127.0.0.1:${port}/d2-strategy-premium/dist/battle-studio-premium.html   (Ctrl+C to stop)`);
