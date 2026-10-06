import { serve, open, boot, sleep, setTick, clickSpeed, playPause, tickNow, readState, tileBudget, wj, WORK } from './common.mjs';
const which = process.argv[2] || 'baseline';
const srv = await serve(which); const S = await open({ vp: 'desktop', port: 9504, profile: 'sound-' + which }); const P = S.page;
const out = { build: which };
try {
  await boot(S, srv.url); await sleep(1200);
  await setTick(P, 421); await sleep(300); await clickSpeed(P, '8x'); await playPause(P); await sleep(2000); await playPause(P); await sleep(400);
  await clickSpeed(P, '1x'); await setTick(P, 546); await sleep(500);
  out.beforeSoundErrors = S.collector.firstParty.length;
  // enable cannon sound (the speaker button)
  await P.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /cannon sound/i.test((x.title || '') + (x.getAttribute('aria-label') || '')) || /^🔇$|^🔊$/.test(x.textContent.trim())); if (b) b.click(); });
  await sleep(500);
  const t0 = await tickNow(P); await playPause(P); await sleep(4000); const t1 = await tickNow(P); const state = (await P.locator('button[title^="Play/Pause"]').textContent()).trim();
  await sleep(2000); const t2 = await tickNow(P);
  out.sound = { tickBefore: t0, tickAfter4s: t1, tickAfter6s: t2, playButtonShows: state, expectedTickAfter4sAt1x: t0 + 8 };
  out.errors = S.collector.firstParty.slice(0, 3).map((e) => `${e.kind}: ${e.text.slice(0, 160)}`);
  console.log(JSON.stringify(out)); wj(`${WORK}/sound-${which}.json`, out);
} finally { await S.close(); await srv.close(); }
