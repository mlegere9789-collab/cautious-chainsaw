// tools/serve.mjs - a tiny static server for the page and the aerial tiles (docs/pitch/anim2 is the root, so ../../basemap/assets resolves).   node tools/serve.mjs [port=9880]
//   then open http://127.0.0.1:9880/d3-field-manual/dist/field-manual.html     (?scene=fresh2&zoom=15 ?style=field-manual&variant=day ?tune=1 ?tour=showcase ... see the header of engine/app.mjs)
import { startServer, SERVE_ROOT } from './lib.mjs';
const port = +process.argv[2] || 9880; await startServer(port); console.log('serving', SERVE_ROOT, 'on http://127.0.0.1:' + port + '/d3-field-manual/dist/field-manual.html');
