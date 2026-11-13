// tools/t0/child_env.mjs - the environment the test runners give their child processes, and the machine load they record.
// Used by tools/t0/run_suites.mjs and by tools/accept/lib/util.mjs (runCmd, runCmdAsync); self-test: node tools/t0/tests/runner_selftest.mjs.
//
// 1. Behind an HTTPS proxy.  On a machine whose outbound HTTPS goes through a proxy that re-terminates TLS (HTTPS_PROXY is set), Node's own
//    fetch() does not use the proxy unless NODE_USE_ENV_PROXY=1 is set (Node 22.21+ and 24+; older versions ignore the variable), and it trusts
//    the proxy's certificate only when NODE_EXTRA_CA_CERTS names the CA bundle.  Without them a suite that fetches a file with Node (the pinned
//    Mapbox GL library of tests/t0/pages-maps.spec.mjs and pages-fixes.spec.mjs) ends in "TypeError: fetch failed" before its first test.
//    Rule: when HTTPS_PROXY (or https_proxy) is set to a non-empty value, a child gets
//        NODE_USE_ENV_PROXY=1                              if NODE_USE_ENV_PROXY is not set, and
//        NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt      if NODE_EXTRA_CA_CERTS is not set and that file exists.
//    Nothing else is touched but the one flag appended to NODE_OPTIONS below: a variable that is already set (to any value, the empty string included)
//    is never overwritten, and with no proxy the environment is passed on as it is (childEnv() then returns the very object it was given).  The
//    variables are inherited, so the Node processes that a Python suite starts get them as well.
//    Side effect, and what the rule does about it: Node 22 prints two lines on stderr at the start of EVERY process that has NODE_USE_ENV_PROXY=1
//    ("[UNDICI-EHPA] Warning: EnvHttpProxyAgent is experimental ...").  A test that reads a child's merged stdout and stderr then sees other output than it
//    sees without a proxy, which is exactly what this rule must not cause (it did: case 16 of tools/t0/tests/baseline_selftest.py parses the LAST line of
//    node's output as JSON and failed on the second warning line, 2026-11-13).  So when the rule itself turns NODE_USE_ENV_PROXY on (and only then: a user
//    who set it keeps what they chose) it also appends  --disable-warning=UNDICI-EHPA  to NODE_OPTIONS: the existing value stays in front, nothing is
//    added when that flag, --no-warnings or NODE_NO_WARNINGS=1 is there already, and nothing is added for a Node that does not read NODE_USE_ENV_PROXY
//    (there is no warning to silence there, and an old Node refuses a flag it does not know).  Only this one warning code is silenced, no other warning.
//    Limit: the Node version that decides is the one of the runner; a different `node` on the PATH of a child is assumed to be the same install.
//    Requests to local servers (127.0.0.1, localhost) stay direct as long as HTTP_PROXY is not set or NO_PROXY lists them (the usual setup).
// 2. Load.  load1() is the 1-minute load average of the machine (os.loadavg()[0], two decimals).  Windows has no load average (Node returns 0
//    there), so load1() is null on Windows: a missing measurement, never a zero.  A timing result is only evidence together with the load it
//    was measured at; the runners store load1Start and load1End for every suite, check and command.
import fs from 'node:fs';
import os from 'node:os';

export const PROXY_CA_BUNDLE = '/root/.ccr/ca-bundle.crt';
export const PROXY_VARS = ['NODE_USE_ENV_PROXY', 'NODE_EXTRA_CA_CERTS'];
export const QUIET_FLAG = '--disable-warning=UNDICI-EHPA';      // appended to NODE_OPTIONS when the rule turns NODE_USE_ENV_PROXY on (see the header)

// environment names are case-insensitive on Windows only (process.env hides that; a copied plain object does not)
const keyOf = (env, name) => {
  if (process.platform !== 'win32') return Object.prototype.hasOwnProperty.call(env, name) && env[name] !== undefined ? name : undefined;
  return Object.keys(env).find((k) => k.toUpperCase() === name.toUpperCase() && env[k] !== undefined);
};
const valueOf = (env, name) => { const k = keyOf(env, name); return k === undefined ? '' : String(env[k]); };

/** true when the environment names an HTTPS proxy (HTTPS_PROXY or https_proxy, non-empty) */
export function httpsProxySet(env = process.env) { return !!(valueOf(env, 'HTTPS_PROXY') || valueOf(env, 'https_proxy')); }

/** true for the Node versions that read NODE_USE_ENV_PROXY (22.21 and later 22.x, 24 and later; older ones ignore it, 23.x never had it), and so for the
 *  ones that print the experimental warning and know --disable-warning.  `version` is a parameter for the self-test only. */
export function honoursEnvProxy(version = process.version) {
  const m = /^v?(\d+)\.(\d+)/.exec(String(version));
  if (!m) return false;
  const major = Number(m[1]), minor = Number(m[2]);
  return major >= 24 || (major === 22 && minor >= 21);
}
/** the warning is silenced already: the flag, --no-warnings or NODE_NO_WARNINGS=1 */
const quietAlready = (env) => /(?:^|\s)--disable-warning(?:=|\s+)UNDICI-EHPA(?:\s|$)|(?:^|\s)--no-warnings(?:\s|$)/.test(valueOf(env, 'NODE_OPTIONS')) || valueOf(env, 'NODE_NO_WARNINGS') === '1';

/** proxyAdditions(env) -> what a child process needs and `env` lacks: {} (no proxy, or everything is set already), or an object with
 *  NODE_USE_ENV_PROXY and/or NODE_EXTRA_CA_CERTS and, when NODE_USE_ENV_PROXY is turned on here, NODE_OPTIONS (the value `env` has plus QUIET_FLAG).
 *  `caBundle`, `exists` and `nodeVersion` are parameters for the self-test only. */
export function proxyAdditions(env = process.env, { caBundle = PROXY_CA_BUNDLE, exists = fs.existsSync, nodeVersion = process.version } = {}) {
  const add = {};
  if (!httpsProxySet(env)) return add;
  const turnOn = keyOf(env, 'NODE_USE_ENV_PROXY') === undefined;
  if (turnOn) add.NODE_USE_ENV_PROXY = '1';
  if (keyOf(env, 'NODE_EXTRA_CA_CERTS') === undefined && exists(caBundle)) add.NODE_EXTRA_CA_CERTS = caBundle;
  if (turnOn && honoursEnvProxy(nodeVersion) && !quietAlready(env)) {
    const cur = valueOf(env, 'NODE_OPTIONS').trim();
    add[keyOf(env, 'NODE_OPTIONS') || 'NODE_OPTIONS'] = cur ? `${cur} ${QUIET_FLAG}` : QUIET_FLAG;      // appended, never replaced; on Windows the key keeps its own spelling
  }
  return add;
}

/** childEnv(env) -> the environment for a child process: `env` itself when nothing has to be added, otherwise a copy with proxyAdditions(env) */
export function childEnv(env = process.env, opts) {
  const add = proxyAdditions(env, opts);
  return Object.keys(add).length ? { ...env, ...add } : env;
}

/** what a summary records about the child environment: never a value (a proxy URL can carry a password), only whether a proxy is named, which variables were
 *  newly set (`added`) and which already had a value that was extended (`extended`: NODE_OPTIONS, by QUIET_FLAG) */
export function childEnvRecord(env = process.env, opts) {
  const names = Object.keys(proxyAdditions(env, opts)), canon = (k) => (k.toUpperCase() === 'NODE_OPTIONS' ? 'NODE_OPTIONS' : k);
  return { httpsProxy: httpsProxySet(env), added: names.filter((k) => keyOf(env, k) === undefined).map(canon), extended: names.filter((k) => keyOf(env, k) !== undefined).map(canon) };
}

/** the console wording of a childEnvRecord, in one place: "unchanged (...)" or "+ NODE_USE_ENV_PROXY, NODE_OPTIONS (extended) (an HTTPS proxy is set)" */
export function describeChildEnv(rec) {
  const parts = [...rec.added, ...rec.extended.map((n) => `${n} (extended)`)];
  return parts.length ? `+ ${parts.join(', ')} (an HTTPS proxy is set)` : `unchanged (${rec.httpsProxy ? 'an HTTPS proxy is set, the Node proxy variables are set already' : 'no HTTPS proxy set'})`;
}

/** 1-minute load average, two decimals; null on Windows (no such measurement there) */
export function load1() {
  if (process.platform === 'win32') return null;
  const v = os.loadavg()[0];
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
}

/** "1.25>3.4" for a console line or a report cell; '' when there is no measurement */
export function loadText(start, end) { return start == null && end == null ? '' : `${start ?? '?'}>${end ?? '?'}`; }

/** the machine a summary was written on */
export function machineRecord() { return { platform: process.platform, cpus: os.cpus().length, node: process.version }; }
