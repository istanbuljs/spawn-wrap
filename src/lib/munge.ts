import { SwContext } from "./context";
import { getExeBasename, isCmd, isNode, isNpm, isSh } from "./exe-type";
import { mungeCmd } from "./mungers/cmd";
import { mungeEnv } from "./mungers/env";
import { mungeNode } from "./mungers/node";
import { mungeNpm } from "./mungers/npm";
import { mungeSh } from "./mungers/sh";
import { mungeShebang } from "./mungers/shebang";
import { InternalSpawnOptions } from "./types";

/**
 * childProcess.ChildProcess.prototype.spawn
 * process.binding('spawn_sync').spawn
 */
export function internalMunge(ctx: SwContext, options: InternalSpawnOptions) {
  const basename = getExeBasename(options.file);

  // XXX: dry this
  if (isSh(basename)) {
    options = mungeSh(ctx, options);
  } else if (isCmd(basename)) {
    options = mungeCmd(ctx, options);
  } else if (isNode(basename)) {
    options = mungeNode(ctx, options);
  } else if (isNpm(basename)) {
    // XXX unnecessary?  on non-windows, npm is just another shebang
    options = mungeNpm(ctx, options);
  } else {
    options = mungeShebang(ctx, options);
  }

  // now the options are munged into shape.
  // whether we changed something or not, we still update the PATH
  // so that if a script somewhere calls `node foo`, it gets our
  // wrapper instead.
  options = mungeEnv(ctx, options);

  return options;
}

/**
 * childProcess.spawn
 */
export function spawnMunge(ctx: SwContext, options: any) {
  throw new Error("NotImplemented");
}

/**
 * childProcess.spawnSync
 */
export function spawnSyncMunge(ctx: SwContext, options: any) {
  throw new Error("NotImplemented");
}
