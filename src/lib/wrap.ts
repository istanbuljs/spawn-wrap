import { debug } from "./debug";
import { internalMunge } from "./munge";

/**
 * childProcess.ChildProcess.prototype.spawn
 * process.binding('spawn_sync').spawn
 */
export function wrapInternalSpawn(fn: any, ctx: any) {
  return wrappedSpawn;

  function wrappedSpawn(this: any, options: any) {
    internalMunge(ctx.shimDir, options);
    debug("WRAPPED", options);
    return fn.call(this, options);
  }
}

/**
 * childProcess.spawn
 */
export function wrapSpawn(fn: any, ctx: any) {
  return wrappedSpawnSync;

  function wrappedSpawnSync(...args: any[]) {
    throw new Error("NotImplemented");
  }
}

/**
 * childProcess.spawnSync
 */
export function wrapSpawnSync(fn: any, ctx: any) {
  return wrappedSpawnSync;

  function wrappedSpawnSync(...args: any[]) {
    throw new Error("NotImplemented");
  }
}
