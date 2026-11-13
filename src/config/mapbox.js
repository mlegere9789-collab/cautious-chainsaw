// The one configuration module of the Mapbox access token (WP-ARCH-09): one reader instead of a literal in every page.
//
// Rules, each checked by src/config/tokens.test.mjs:
//   - this file is the only reader of the build variable named by TOKEN_ENV_NAME; no other file under src/ names it;
//   - no token literal is written anywhere in src/: the value comes from the build environment, never from a file of the repository;
//   - a production build without the variable fails with MapboxTokenError (code MAPBOX_TOKEN_MISSING); any other build gets null;
//   - a secret token (sk.) is refused in every mode, because the value ends up in a public page; so is any value that is not a
//     public token (pk.); no error text ever contains the value;
//   - importing this file never throws. The call does, so a page can still show its labelled fallback instead of a blank screen.
//
// Two routes lead to the value, because the same file runs in the browser bundle and in Node tooling and tests:
//   - the bundler's import.meta.env: Vite and Astro replace the member expressions below at build time (checked with Vite 8.3.8).
//     The build must expose the PUBLIC_ prefix: Astro does by default, a plain Vite build needs envPrefix: 'PUBLIC_'. Without it the
//     value is not embedded, and a production build then fails closed here, at the call.
//   - process.env, in Node. A browser has no process, so nothing is read there.
// The member expressions are written out on purpose: a bundler does not replace import.meta.env[name].

/** The one build variable that carries the public Mapbox token. */
export const TOKEN_ENV_NAME = 'PUBLIC_MAPBOX_TOKEN';

// A public token: pk. then letters, digits, dot, dash and underscore (the payload and the signature of the token are base64url).
const PUBLIC_TOKEN_SHAPE = /^pk\.[A-Za-z0-9._-]+$/;

/** The error of this module. Its name and its code are what callers test; its message never holds the token value. */
export class MapboxTokenError extends Error {
  /**
   * @param {'MAPBOX_TOKEN_MISSING' | 'MAPBOX_TOKEN_SECRET' | 'MAPBOX_TOKEN_MALFORMED'} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
// Set on the prototype, as the built-in errors do, so that the stack header of a thrown error already reads "MapboxTokenError: ...".
Object.defineProperty(MapboxTokenError.prototype, 'name', { value: 'MapboxTokenError', writable: true, configurable: true });

/** The environment of the running code: the bundler's values when a bundler replaced them, the process values otherwise. */
function defaultEnv() {
  /** @type {Record<string, string | boolean | undefined>} */
  const env = {
    PUBLIC_MAPBOX_TOKEN: import.meta.env?.PUBLIC_MAPBOX_TOKEN,
    PROD: import.meta.env?.PROD,
    MODE: import.meta.env?.MODE,
  };
  if (typeof process !== 'undefined' && process.env) {
    if (env.PUBLIC_MAPBOX_TOKEN === undefined) env.PUBLIC_MAPBOX_TOKEN = process.env.PUBLIC_MAPBOX_TOKEN;
    env.NODE_ENV = process.env.NODE_ENV;
  }
  return env;
}

/** @param {unknown} env */
function assertEnvObject(env) {
  if (env === null || typeof env !== 'object') {
    throw new TypeError('The environment must be an object (for example process.env or import.meta.env).');
  }
}

/**
 * True for a production build. One signal is enough, so a doubtful environment fails closed:
 * the bundler's PROD flag (also true for a staging mode of a production build), MODE 'production', or NODE_ENV 'production'.
 * @param {Record<string, string | boolean | undefined>} [env] defaults to the environment of the running code
 * @returns {boolean}
 */
export function isProductionBuild(env = defaultEnv()) {
  assertEnvObject(env);
  return env.PROD === true || env.MODE === 'production' || env.NODE_ENV === 'production';
}

/**
 * The public Mapbox token, trimmed.
 * Unset or blank: MapboxTokenError (MAPBOX_TOKEN_MISSING) in a production build, null otherwise (the map shows its fallback).
 * A secret token (sk.): MapboxTokenError (MAPBOX_TOKEN_SECRET) in every mode. Anything else that is not a public token:
 * MapboxTokenError (MAPBOX_TOKEN_MALFORMED).
 * @param {Record<string, string | boolean | undefined>} [env] defaults to the environment of the running code
 * @returns {string | null}
 */
export function getMapboxToken(env = defaultEnv()) {
  assertEnvObject(env);
  const raw = env[TOKEN_ENV_NAME];
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (value === '') {
    if (isProductionBuild(env)) {
      throw new MapboxTokenError(
        'MAPBOX_TOKEN_MISSING',
        `${TOKEN_ENV_NAME} is not set. A production build needs the public Mapbox token: set ${TOKEN_ENV_NAME} in the build environment ` +
          "(a pk. token that the Mapbox account restricts to the site's address).",
      );
    }
    return null;
  }
  if (value.startsWith('sk.')) {
    throw new MapboxTokenError(
      'MAPBOX_TOKEN_SECRET',
      `${TOKEN_ENV_NAME} holds a secret Mapbox token (sk.). A secret token must never be built into a public page: ` +
        "use a public token (pk.) that the Mapbox account restricts to the site's address. The value is not shown.",
    );
  }
  if (!PUBLIC_TOKEN_SHAPE.test(value)) {
    throw new MapboxTokenError(
      'MAPBOX_TOKEN_MALFORMED',
      `${TOKEN_ENV_NAME} is set but is not a public Mapbox token (a public token starts with pk. and holds no spaces). The value is not shown.`,
    );
  }
  return value;
}
