// Types for src/config/mapbox.js (WP-ARCH-09). The module is plain JavaScript so that every test runs on Node without a TypeScript toolchain;
// strict TypeScript consumers (the map facade, the build scripts) import it through this declaration.

/** The one build variable that carries the public Mapbox token. */
export declare const TOKEN_ENV_NAME: 'PUBLIC_MAPBOX_TOKEN';

export type MapboxTokenErrorCode = 'MAPBOX_TOKEN_MISSING' | 'MAPBOX_TOKEN_SECRET' | 'MAPBOX_TOKEN_MALFORMED';

/** An environment: process.env, import.meta.env, or a plain object of the same shape. */
export type MapboxEnv = Readonly<Record<string, string | boolean | undefined>>;

/** The error of this module. Its message never holds the token value. */
export declare class MapboxTokenError extends Error {
  readonly name: 'MapboxTokenError';
  readonly code: MapboxTokenErrorCode;
  constructor(code: MapboxTokenErrorCode, message: string);
}

/** True for a production build: the bundler's PROD flag, MODE 'production', or NODE_ENV 'production'; one signal is enough. */
export declare function isProductionBuild(env?: MapboxEnv): boolean;

/**
 * The public Mapbox token, trimmed.
 * Unset or blank: throws MapboxTokenError (MAPBOX_TOKEN_MISSING) in a production build, returns null otherwise.
 * A secret token (sk.) or a value that is not a public token (pk.): throws MapboxTokenError in every mode.
 */
export declare function getMapboxToken(env?: MapboxEnv): string | null;
