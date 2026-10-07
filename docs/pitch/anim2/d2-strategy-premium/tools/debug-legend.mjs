import { launch, settle } from './lib.mjs';
const run = await launch({ w: 1440, h: 900, dpr: 1, query: 'manual=1' });
const { page } = run;
try {
  const r = await page.evaluate(async () => {
    const st = window.__studio; const e = st.engine; e.transport.pause(); window.__adv(30, 20);
    const before = JSON.stringify(st.host.state.mod && st.host.state.mod.legend);
    const ok = st.host.act('legend:legend', 'toggle'); window.__adv(60, 20);
    const out = st.lastOut; const cards = out.cards.map((c) => ({ id: c.id, form: c.form && c.form.id, rect: c.rect, lane: c.lane, hidden: c.hidden, opacity: c.opacity }));
    return { before, ok, after: JSON.stringify(st.host.state.mod.legend), cards: cards.filter((c) => /legend/.test(c.id)), nrows: (e.kernel.skins.get(e.tok('skin.id')).legend() || []).length };
  });
  console.log(JSON.stringify(r, null, 1));
} finally { await run.close(); }
