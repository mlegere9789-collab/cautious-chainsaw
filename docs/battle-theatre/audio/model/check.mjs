import { absorption, speedOfSound, groundAttenuation, buildTables, fitAirLowpass, onePoleDb } from './acoustics.mjs';
const bands = [63, 125, 250, 500, 1000, 2000, 4000, 8000];
console.log('ISO 9613-1 alpha, dB/km at octave centres', bands.join(' '));
for (const [t, rh] of [[10, 70], [15, 70], [20, 70], [30, 70], [15, 20], [15, 50], [15, 80], [25, 60], [30, 60]]) console.log(`${t}C ${rh}%`.padEnd(8), bands.map(f => (absorption(f, t, rh) * 1000).toFixed(1)).join(' '));
console.log('c(20C)=', speedOfSound(20).toFixed(1), 'c(25C)=', speedOfSound(25).toFixed(1), 'c(30C)=', speedOfSound(30).toFixed(1), ' 2 km delay at 343 =', (2000 / 343).toFixed(2), 's; at 30C =', (2000 / speedOfSound(30)).toFixed(2), 's');
console.log('ground A_gr (G=1, hs=1.5,hr=1.6) dB per band 125/250/500/1000/2000:');
for (const d of [100, 300, 1000, 3000]) console.log(' d=' + d, [125, 250, 500, 1000, 2000].map(f => groundAttenuation(f, 1.5, 1.6, d).toFixed(1)).join(' '));
console.log('air LP fit (2 poles) a and rms dB error:'); for (const d of [100, 500, 1000, 2000, 3000]) { const r = fitAirLowpass(d); console.log(' d=' + d, 'a=' + r.a.toFixed(3), 'rms=' + r.rms.toFixed(2), ' true/fit dB at 1k,2k,4k,8k:', [1000, 2000, 4000, 8000].map(f => (-absorption(f, 25, 60) * d).toFixed(1) + '/' + (2 * onePoleDb(r.a, f, 48000)).toFixed(1)).join('  ')); }
const T = buildTables(); console.log('tables', T.n, 'entries; a[10m]=', T.lpTab[0].toFixed(3), 'a[1km]=', T.lpTab[99].toFixed(3), 'a[3km]=', T.lpTab[299].toFixed(3), 'gnd[100m]=', T.gndLin[9].toFixed(3), 'gnd[1km]=', T.gndLin[99].toFixed(3));
