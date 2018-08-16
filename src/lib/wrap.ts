import cp from "child_process";
import { SwContext } from "./context";
import { debug } from "./debug";
import { internalMunge } from "./munge";
import { InternalSpawnOptions } from "./types";

/**
 * childProcess.ChildProcess.prototype.spawn
 * process.binding('spawn_sync').spawn
 */
export function wrapInternalSpawn(fn: any, ctx: SwContext) {
  return wrappedSpawn;

  function wrappedSpawn(this: any, options: Readonly<InternalSpawnOptions>): any {
    options = internalMunge(ctx, options);
    debug("WRAPPED", options);
    return fn.call(this, options);
  }
}

/**
 * childProcess.spawn
 */
export function wrapSpawn(fn: typeof cp.spawn, ctx: SwContext): typeof cp.spawn {
  return wrappedSpawnSync as typeof cp.spawn;

  function wrappedSpawnSync(...args: any[]) {
    throw new Error("NotImplemented");
  }
}

/**
 * childProcess.spawnSync
 */
export function wrapSpawnSync(fn: typeof cp.spawnSync, ctx: SwContext): typeof cp.spawnSync {
  return wrappedSpawnSync as typeof cp.spawnSync;

  function wrappedSpawnSync(...args: any[]) {
    throw new Error("NotImplemented");
  }
}
