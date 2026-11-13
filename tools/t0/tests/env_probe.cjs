'use strict';
// tools/t0/tests/env_probe.cjs - preload of the runner self-test (tools/t0/tests/runner_selftest.mjs); nothing else loads it.
// The self-test starts a runner with NODE_OPTIONS=--require <this file>, so this runs at the start of EVERY Node process below it (the runner, each suite process,
// the Node processes a Python suite starts) and appends one line to the file named by T0_ENV_PROBE_OUT: which script the process runs, the names of all its
// environment variables with a short sha256 of each value (two environments can be compared exactly and no value reaches the disk), and the plain values of the
// few variables the self-test asserts on.  Without T0_ENV_PROBE_OUT it does nothing.
const out = process.env.T0_ENV_PROBE_OUT;
if (out) {
  try {
    const crypto = require('node:crypto');
    const SHOW = ['NODE_USE_ENV_PROXY', 'NODE_EXTRA_CA_CERTS', 'NODE_OPTIONS', 'T0_PORT_BASE', 'T0_AGENT', 'PYTHONIOENCODING', 'T0_PROBE_MARK'];
    const hashes = {};
    for (const k of Object.keys(process.env).sort()) hashes[k] = crypto.createHash('sha256').update(String(process.env[k])).digest('hex').slice(0, 16);
    const show = {};
    for (const k of SHOW) show[k] = process.env[k] === undefined ? null : process.env[k];
    require('node:fs').appendFileSync(out, JSON.stringify({ pid: process.pid, ppid: process.ppid, script: process.argv[1] || null, args: process.argv.slice(2), execArgv: process.execArgv, show, hashes }) + '\n');
  } catch (e) { /* the probe never breaks the process it watches */ }
}
