import assert from "assert";
import cp from "child_process";
import { SwContext } from "./context";
import { getExeBasename, isCmd, isNode, isNpm, isSh } from "./exe-type";
import { mungeCmd } from "./mungers/cmd";
import { mungeEnv } from "./mungers/env";
import { mungeNode } from "./mungers/node";
import { mungeNpm } from "./mungers/npm";
import { mungeSh } from "./mungers/sh";
import { mungeShebang } from "./mungers/shebang";
import { InternalSpawnOptions, NormalizedOptions } from "./types";

export type SpawnArgs = [string, ReadonlyArray<string> | undefined, cp.SpawnOptions | undefined];

const ENV_PAIR_RE = /^([^=]+)=([\s\S]*)$/;

/**
 * childProcess.ChildProcess.prototype.spawn
 * process.binding('spawn_sync').spawn
 */
export function mungeInternal(ctx: SwContext, internal: Readonly<InternalSpawnOptions>): InternalSpawnOptions {
  return mergeWithInternal(internal, mungeNormalized(ctx, internalToNormalized(internal)));
}

/**
 * childProcess.spawn
 * childProcess.spawnSync
 */
export function mungeSpawn(ctx: SwContext, spawn: SpawnArgs): SpawnArgs {
  return mergeWithSpawn(spawn, mungeNormalized(ctx, spawnToNormalized(spawn)));
}

function mungeNormalized(ctx: SwContext, normalized: NormalizedOptions): NormalizedOptions {
  const basename: string = getExeBasename(normalized.file);

  // XXX: dry this
  if (isSh(basename)) {
    normalized = mungeSh(ctx, normalized);
  } else if (isCmd(basename)) {
    normalized = mungeCmd(ctx, normalized);
  } else if (isNode(basename)) {
    normalized = mungeNode(ctx, normalized);
  } else if (isNpm(basename)) {
    // XXX unnecessary?  on non-windows, npm is just another shebang
    normalized = mungeNpm(ctx, normalized);
  } else {
    normalized = mungeShebang(ctx, normalized);
  }

  // now the options are munged into shape.
  // whether we changed something or not, we still update the PATH
  // so that if a script somewhere calls `node foo`, it gets our
  // wrapper instead.
  return mungeEnv(ctx, normalized);
}

function internalToNormalized(internal: Readonly<InternalSpawnOptions>): NormalizedOptions {
  const env = new Map();
  for (const ep of internal.envPairs) {
    const match = ENV_PAIR_RE.exec(ep);
    if (match === null) {
      throw new assert.AssertionError({message: `Expected envPair to match ${ENV_PAIR_RE.source}: ${ep}`});
    }
    env.set(match[1]!, match[2]!);
  }
  return {file: internal.file, args: internal.args, env};
}

function mergeWithInternal(
  internal: Readonly<InternalSpawnOptions>,
  normalized: NormalizedOptions,
): InternalSpawnOptions {
  const envPairs: string[] = [];
  for (const [key, value] of normalized.env) {
    envPairs.push(`${key}=${value}`);
  }
  return {...internal, file: normalized.file, args: [...normalized.args], envPairs};
}

function spawnToNormalized([file, args, options]: SpawnArgs): NormalizedOptions {
  if (Array.isArray(args)) {
    args = [...args];
  } else {
    if (typeof args === "object" && args !== null) {
      options = args as any as cp.SpawnOptions;
    }
    args = [];
  }
  options = options !== undefined ? {...options} : {};
  args = [options.argv0 !== undefined ? options.argv0 : file].concat(args);

  return {file, args, env: envRecordToMap(options.env)};
}

function mergeWithSpawn(
  [file, args, options]: SpawnArgs,
  normalized: NormalizedOptions,
): SpawnArgs {
  const newFile: string = normalized.file;
  const newArgs: string[] = [...normalized.args.slice(1)];
  const env: Record<string, string> = envMapToRecord(normalized.env);
  const argv0: string | undefined = normalized.args[0] !== newFile ? normalized.args[0] : undefined;
  return [newFile, newArgs, {...options, env, argv0}];
}

function envRecordToMap(env: Readonly<Record<string, string | undefined>> | undefined): Map<string, string> {
  if (env === undefined) {
    env = process.env;
  }
  const result: Map<string, string> = new Map();
  // Deliberately collect keys from prototype
  // tslint:disable-next-line:forin
  for (const name in env) {
    const value = env[name];
    if (value !== undefined) {
      result.set(name, value);
    }
  }
  return result;
}

function envMapToRecord(env: ReadonlyMap<string, string>): Record<string, string> {
  const result: Record<string, string> = Object.create(null);
  for (const [key, value] of env) {
    result[key] = value;
  }
  return result;
}
