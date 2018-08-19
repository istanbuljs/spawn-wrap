import signalExit from "signal-exit";
import { createWrapContextSync, destroyWrapContextSync, SwContext } from "./context";
import { IS_DEBUG } from "./debug";
import { SwOptions } from "./types";
import { wrapInternalSpawn } from "./wrap";

// export function legacyWrap(args: string[], env?: Record<string, string>): () => void;
// export function legacyWrap(args: undefined, env: Record<string, string>): () => void;
// export function legacyWrap(args: any, env: any): any {
//   if (typeof args === "object" && !Array.isArray(args) && env === undefined) {
//     // We were passed a single `env` object
//     env = args;
//     args = undefined;
//   }
//   return wrapGlobal({args, env});
// }

export function wrapGlobal(options: SwOptions): () => void {
  const ctx = createWrapContextSync(options);
  signalExit(cleanUp);
  const unwrapApi = applyContextOnGlobal(ctx);
  return unwrap;

  function cleanUp() {
    if (IS_DEBUG) {
      destroyWrapContextSync(ctx);
    }
  }

  function unwrap() {
    unwrapApi();
    cleanUp();
  }
}

export function applyContextOnGlobal(ctx: SwContext): () => void {
  const cp = require("child_process");
  const spawn = (cp as any).ChildProcess.prototype.spawn;
  const spawnSync = (process as any).binding("spawn_sync").spawn;

  function unwrap() {
    (cp as any).ChildProcess.prototype.spawn = spawn;
    (process as any).binding("spawn_sync").spawn = spawnSync;
  }

  (cp as any).ChildProcess.prototype.spawn = wrapInternalSpawn(spawn, ctx);
  (process as any).binding("spawn_sync").spawn = wrapInternalSpawn(spawnSync, ctx);

  return unwrap;
}
