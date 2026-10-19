// The "how sure are we" tooltip text of the CLOCK group: GTBGT.u(tick) / GTBGTime.u(tick).
// Source of truth: data-src/time/time_anchors.json (uncertainty_min and adj_status of every anchor). The function is a small table (one row per anchor: tick,
// uncertainty in minutes, status code) and a straight-line mix between the two anchors that enclose a tick, the same rule tools/time/build.mjs applies to write
// tools/time/build/uncertainty.json (docs/time/ANCHORS-FINAL.md: "the bound at a tick between two anchors is the linear interpolation"; the status of a tick between
// two anchors is the weaker of the two). It is appended to the inlined time module by the CLOCK patches; it adds about 0.5 KB.
//
//   u(538)  ->  "give or take 60 minutes. Contested: first-hand accounts disagree."          (an anchor tick: its own adjudicated status)
//   u(540)  ->  "give or take 55 minutes. Between two anchored times, at least one Contested ..."  (a tick between anchors: the weaker of the two)
//
// The wording is the only free text here; every number comes from the anchors file.
const WORDS = ['Contested: first-hand accounts disagree', 'Estimated: no source gives this moment a clock time', 'Documented: a first-hand source gives a clock time'];
const MID = ['Between two anchored times, at least one of them Contested (first-hand accounts disagree)', 'Between two anchored times, at least one of them only Estimated', 'Between two anchored times, both Documented by first-hand sources'];
const CODE = { Contested: 0, Estimated: 1, Documented: 2 };

export function uncertaintyRows(doc) {
  return doc.anchors.map((a) => {
    if (!(a.adj_status in CODE)) throw new Error('anchor ' + a.tick + ' has no adjudicated status');
    if (!(a.uncertainty_min > 0)) throw new Error('anchor ' + a.tick + ' has no uncertainty_min');
    return [a.tick, a.uncertainty_min, CODE[a.adj_status]];
  });
}

/** JS expression (a function) source for the tooltip text; evaluates to function(tick) -> string. No dependency on the time module. */
export function uncertaintyFnSource(doc) {
  const rows = JSON.stringify(uncertaintyRows(doc));
  return '(function(){var R=' + rows + ',W=' + JSON.stringify(WORDS) + ',M=' + JSON.stringify(MID) + ';return function(t){t=+t;if(t!==t)t=1;t=t<1?1:t>R[R.length-1][0]?R[R.length-1][0]:t;var i=0;while(i<R.length-2&&R[i+1][0]<=t)i++;'
    + 'var a=R[i],b=R[i+1],u,s,L=W;if(t===a[0]){u=a[1];s=a[2]}else if(t===b[0]){u=b[1];s=b[2]}else{var w=(t-a[0])/(b[0]-a[0]);u=a[1]*(1-w)+b[1]*w;s=Math.min(a[2],b[2]);L=M}'
    + 'return"give or take "+Math.round(u/5)*5+" minutes. "+L[s]+"."}})()';
}
