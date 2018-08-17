import cp from "child_process";
import { SwContext } from "./context";
import { mungeInternal, mungeSpawn } from "./munge";
import { InternalSpawnOptions } from "./types";

/**
 * childProcess.ChildProcess.prototype.spawn
 * process.binding('spawn_sync').spawn
 */
export function wrapInternalSpawn(fn: any, ctx: SwContext) {
  return wrappedInternalSpawn;

  function wrappedInternalSpawn(this: any, options: Readonly<InternalSpawnOptions>): any {
    return fn.call(this, mungeInternal(ctx, options));
  }
}

/**
 * childProcess.spawn
 * childProcess.spawnSync
 */
export function wrapSpawn<F extends (typeof cp.spawn | typeof cp.spawnSync)>(ctx: SwContext, fn: F): F {
  return wrappedSpawn as F;

  function wrappedSpawn(
    this: any,
    file: string,
    args?: ReadonlyArray<string>,
    options?: cp.SpawnOptions | cp.SpawnSyncOptions,
  ): any {
    return fn.call(this, ...mungeSpawn(ctx, [file, args, options]));
  }
}
