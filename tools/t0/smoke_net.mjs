import { launch } from './cdp.mjs';
const run = async (url, label) => {
  const c = await launch(9450, 1440, 900, false);
  const req = []; c.ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.method === 'Network.requestWillBeSent' && /\/data\//.test(m.params.request.url)) req.push(m.params.request.url.split('/data/')[1]); });
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('gtbg_onboarded','1')}catch(e){}" });
  await c.send('Page.navigate', { url }); await c.sleep(9000);
  const d = (re) => req.filter(r => re.test(r)).length;
  console.log(label, '| total data reqs', req.length, '| day1 placements', d(/placements_day1|density_day1/), '| day2', d(/day2/), '| day3', d(/day3/));
  await c.close();
};
await run('http://127.0.0.1:8202/?tick=451', 'NEW build ?tick=451');
await run('http://127.0.0.1:8203/?tick=451', 'OLD build ?tick=451');
process.exit(0);
