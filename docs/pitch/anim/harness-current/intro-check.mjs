import { serve, open, sleep, tileBudget, wj, WORK } from './common.mjs';
const which = process.argv[2] || 'r1c';
const srv = await serve(which); const S = await open({ vp: 'desktop', port: 9506, profile: 'intro-' + which }); const P = S.page;
const marks = {};
try {
  const t0 = Date.now(); await P.goto(srv.url + '/', { waitUntil: 'commit' });
  for (let i = 0; i < 160; i++) {
    const txt = await P.evaluate(() => document.body ? document.body.innerText.replace(/\s+/g, ' ') : '').catch(() => '');
    const t = Date.now() - t0;
    for (const [k, re] of Object.entries({ loadingData: /Loading battle data/, fastForward: /Fast-forwarding/, chooser: /Choose Your Experience/, toolbar: /Toggle Units/, skipIntro: /Skip intro/ })) { if (re.test(txt)) { marks[k] ||= { first: t }; marks[k].last = t; } }
    await sleep(100);
  }
  console.log(which, JSON.stringify(marks));
  wj(`${WORK}/intro-${which}.json`, marks);
} finally { await S.close(); await srv.close(); }
