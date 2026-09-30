// chips.js - follow-up chips derived from the answer's entity kinds (not a static list). Every chip is a question the engine can answer; the test suite asks each one.
import { SIDE_NAME } from './format.js';

export function makeChips(kb, S, ans) {
  const { idx } = kb;
  const out = [];
  const add = (label, q) => { if (out.length < 5 && !out.some((c) => c.q === q || c.label === label)) out.push({ label, q }); };
  const focusId = (ans.shown || []).find((id) => idx.get(id) && idx.get(id).k !== 'person');
  const f = focusId ? idx.get(focusId) : null;
  if (f) {
    const nm = f.k === 'regiment' || f.k === 'artillery' ? f.short || f.label : f.label;
    const the = (s) => (/^(the |[A-Z][a-z]+ Brigade$|Iron|Irish)/.test(s) || /Brigade|Division|Corps|Army|Battery|Battalion/.test(s) ? `the ${s}`.replace(/^the the /, 'the ') : `the ${s}`);
    const unitLike = ['regiment', 'brigade', 'division', 'corps', 'army', 'artillery', 'artillery-unit'].includes(f.k);
    if (unitLike) {
      const side = f.side ? `${SIDE_NAME[f.side]} ` : '';
      const qn = f.k === 'corps' ? `${side}${f.title}` : nm;
      if (S.intent !== 'who-commanded') add('Commander', `Who commanded ${f.k === 'army' ? 'the ' + nm : f.k === 'corps' ? 'the ' + qn : the(nm)}?`);
      if (S.intent !== 'casualties' && f.k !== 'artillery-unit') add('Casualties', `How many men did ${f.k === 'army' ? 'the ' + nm : f.k === 'corps' ? 'the ' + qn : the(nm)} lose?`);
      if (S.intent !== 'what-happened') add('What happened', `What happened to ${f.k === 'corps' ? 'the ' + qn : the(nm)}?`);
      if (['brigade', 'division', 'corps'].includes(f.k)) add('Members', `Which ${{ brigade: 'regiments', division: 'brigades', corps: 'divisions' }[f.k]} were in ${f.k === 'corps' ? 'the ' + qn : the(nm)}?`);
      const par = (f.par || []).map((id) => idx.get(id)).filter(Boolean)[0];
      if (par && ['brigade', 'division'].includes(par.k)) add(`About ${par.label}`, `Tell me about ${par.k === 'corps' ? 'the ' + par.title : the(par.label)}`);
    } else if (f.k === 'terrain' || ['road', 'structure', 'feature'].includes(f.k)) {
      add('What happened here', `What happened at ${f.label.replace(/^The /, 'the ')}?`);
      if (f.attrs.elevation) add('Elevation', `How high is ${f.label.replace(/^The /, 'the ')}?`);
    } else if (f.k === 'vignette' || f.k === 'chronology') {
      const day = f.attrs.day; if (day) add(`Key moments of July ${day}`, `What happened on July ${day}?`);
    } else if (f.k === 'succession') {
      const u = f.attrs.unit && idx.get(f.attrs.unit); if (u) add('Who commanded it', `Who commanded ${u.k === 'corps' ? 'the ' + u.title : the(u.label)}?`);
    }
  }
  if (S.intent === 'day-range' || S.intent === 'day-outside') for (const d of (S.intent === 'day-range' && S.range ? S.range : [1, 2, 3])) add(`Key moments of July ${d}`, `What happened on July ${d}?`);
  if (S.intent === 'ancestor' || S.intent === 'presence') add('Find your ancestor', 'How do I find my ancestor on this site?');
  if (!out.length) { add('20th Maine', '20th Maine'); add('Little Round Top', 'What happened at Little Round Top?'); add('Pickett’s Charge', 'What was Pickett’s Charge?'); }
  return out;
}
