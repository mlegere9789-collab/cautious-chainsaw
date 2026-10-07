// tools/serve.mjs - a static server over docs/pitch/anim2 so the built page finds ../../basemap/assets/ (node tools/serve.mjs [port], default 9900); Ctrl+C stops it.
import { serve, PORT } from './lib.mjs';
const port = +(process.argv[2] || PORT); await serve(port); console.log(`serving docs/pitch/anim2 on http://127.0.0.1:${port}/d4-editorial/dist/battle-studio.html`);
