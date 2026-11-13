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
//    Nothing else is touched: a variable that is already set (to any value, the empty string included) is never overwritten, and with no proxy
//    the environment is passed on as it is (childEnv() then returns the very object it was given).  The variables are inherited, so the Node
//    processes that a Python suite starts get them as well.
//    Side effect to know: Node 22 prints one warning on stderr at the start of every process that has NODE_USE_ENV_PROXY=1
//    ("[UNDICI-EHPA] Warning: EnvHttpProxyAgent is experimental"); the runners count results on stdout lines, which it does not touch.
//    Requests to local servers (127.0.0.1, localhost) stay direct as long as HTTP_PROXY is not set or NO_PROXY lists them (the usual setup).
// 2. Load.  load1() is the 1-minute load average of the machine (os.loadavg()[0], two decimals).  Windows has no load average (Node returns 0
//    there), so load1() is null on Windows: a missing measurement, never a zero.  A timing result is only evidence together with the load it
//    was measured at; the runners store load1Start and load1End for every suite, check and command.
import fs from 'node:fs';
import os from 'node:os';

export const PROXY_CA_BUNDLE = '/root/.ccr/ca-bundle.crt';
export const PROXY_VARS = ['NODE_USE_ENV_PROXY', 'NODE_EXTRA_CA_CERTS'];

// environment names are case-insensitive on Windows only (process.env hides that; a copied plain object does not)
const keyOf = (env, name) => {
  if (process.platform !== 'win32') return Object.prototype.hasOwnProperty.call(env, name) && env[name] !== undefined ? name : undefined;
  return Object.keys(env).find((k) => k.toUpperCase() === name.toUpperCase() && env[k] !== undefined);
};
const valueOf = (env, name) => { const k = keyOf(env, name); return k === undefined ? '' : String(env[k]); };

/** true when the environment names an HTTPS proxy (HTTPS_PROXY or https_proxy, non-empty) */
export function httpsProxySet(env = process.env) { return !!(valueOf(env, 'HTTPS_PROXY') || valueOf(env, 'https_proxy')); }

/** proxyAdditions(env) -> the variables a child process needs and `env` lacks: {} (no proxy, or everything is set already), or an object with
 *  NODE_USE_ENV_PROXY and/or NODE_EXTRA_CA_CERTS.  `caBundle` and `exists` are parameters for the self-test only. */
export function proxyAdditions(env = process.env, { caBundle = PROXY_CA_BUNDLE, exists = fs.existsSync } = {}) {
  const add = {};
  if (!httpsProxySet(env)) return add;
  if (keyOf(env, 'NODE_USE_ENV_PROXY') === undefined) add.NODE_USE_ENV_PROXY = '1';
  if (keyOf(env, 'NODE_EXTRA_CA_CERTS') === undefined && exists(caBundle)) add.NODE_EXTRA_CA_CERTS = caBundle;
  return add;
}

/** childEnv(env) -> the environment for a child process: `env` itself when nothing has to be added, otherwise a copy with proxyAdditions(env) */
export function childEnv(env = process.env, opts) {
  const add = proxyAdditions(env, opts);
  return Object.keys(add).length ? { ...env, ...add } : env;
}

/** what a summary records about the child environment: never a value (a proxy URL can carry a password), only whether a proxy is named and which variables were added */
export function childEnvRecord(env = process.env, opts) { return { httpsProxy: httpsProxySet(env), added: Object.keys(proxyAdditions(env, opts)) }; }

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
