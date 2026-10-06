// Full-day playback view of the coverage numbers: per day and zoom (default camera), at 1x
// persistent overlays: every 5th tick (45 samples per day); transient cards: at every tick that has one (exact), all other ticks 0.
import fs from 'node:fs';
const ev = JSON.parse(fs.readFileSync('tmp/pitch-anim/popups/out/cover-event-R1c.json', 'utf8'));
const s5 = JSON.parse(fs.readFileSync('tmp/pitch-anim/popups/out/cover-R1c.json', 'utf8')).sample5;
const days = { 1: [1, 225], 2: [226, 450], 3: [451, 675] };
const out = {};
for (const z of [12, 13.5, 15.5]) for (const [d, [a, b]] of Object.entries(days)) {
  const rows = ev.event.filter((r) => r.zoom === z && r.tick >= a && r.tick <= b);
  const withCard = rows.filter((r) => r.def.transient.anyTiles >= 0 && (r.hasEvent || r.hasStory));
  const ticks = b - a + 1;
  const cardTicks = withCard.length;
  const coveredTicks = withCard.filter((r) => r.def.transient.anyTiles > 0).length;
  const sumTiles = withCard.reduce((acc, r) => acc + r.def.transient.anyTiles, 0);
  const subjTicks = withCard.filter((r) => r.def.transient.subjCovered > 0).length;
  const per = s5.filter((r) => r.zoom === z && r.tick >= a && r.tick <= b);
  out[`day${d}@z${z}`] = {
    seconds1x: ticks * 0.5,
    ticksWithAnyCard: cardTicks, secondsWithACard: cardTicks * 0.5, shareOfTimeWithACard: +(cardTicks / ticks).toFixed(3),
    ticksWithATileUnderACard: coveredTicks, shareOfTimeCardOnATile: +(coveredTicks / ticks).toFixed(3),
    meanTilesUnderCardsOverTheDay: +(sumTiles / ticks).toFixed(2), meanTilesUnderCardsWhileACardIsUp: +(sumTiles / Math.max(1, cardTicks)).toFixed(1),
    ticksCardOnASubjectTile: subjTicks,
    persistentSamples: per.length, persistentTilesCoveredMean: +(per.reduce((acc, r) => acc + r.persistentTiles, 0) / Math.max(1, per.length)).toFixed(1), persistentHalfHiddenMean: +(per.reduce((acc, r) => acc + r.persistentHalf, 0) / Math.max(1, per.length)).toFixed(1), tilesOnScreenMean: +(per.reduce((acc, r) => acc + r.tiles, 0) / Math.max(1, per.length)).toFixed(0),
  };
}
fs.writeFileSync('tmp/pitch-anim/popups/out/dayplayback.json', JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(12), JSON.stringify(v));
