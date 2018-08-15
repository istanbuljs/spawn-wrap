import Module from "module";
import path from "path";
import signalExit from "signal-exit";
import { createWrapContextSync, destroyWrapContextSync } from "./context";
import { IS_DEBUG } from "./debug";
import { wrapInternalSpawn } from "./wrap";

export function legacyWrap(args: string[], env?: Record<string, string>): any;
export function legacyWrap(args: undefined, env: Record<string, string>): any;
export function legacyWrap(args: any, env: any): any {
  if (typeof args === "object" && !Array.isArray(args) && env === undefined) {
    // We were passed a single `env` object
    env = args;
    args = undefined;
  }
  return wrapGlobal({args, env});
}

export function wrapGlobal(options: any): any {
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

export function applyContextOnGlobal(ctx: any): any {
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

export function runMain(): void {
  process.argv.splice(1, 1);
  process.argv[1] = path.resolve(process.argv[1]);
  delete require.cache[process.argv[1]];
  Module.runMain();
}
