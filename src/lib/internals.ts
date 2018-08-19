import signalExit from "signal-exit";
import { createWrapContextSync, destroyWrapContextSync, SwContext } from "./context";
import { IS_DEBUG } from "./debug";
import { SwOptions } from "./types";
import { wrapInternalSpawn } from "./wrap";

export function patchInternals(options: SwOptions): () => void {
  const ctx = createWrapContextSync(options);
  signalExit(cleanUp);
  const unwrapApi = patchInternalsWithContext(ctx);
  return unpatch;

  function cleanUp() {
    if (IS_DEBUG) {
      destroyWrapContextSync(ctx);
    }
  }

  function unpatch() {
    unwrapApi();
    cleanUp();
  }
}

export function patchInternalsWithContext(ctx: SwContext): () => void {
  const cp = require("child_process");
  const spawn = (cp as any).ChildProcess.prototype.spawn;
  const spawnSync = (process as any).binding("spawn_sync").spawn;

  function unpatch() {
    (cp as any).ChildProcess.prototype.spawn = spawn;
    (process as any).binding("spawn_sync").spawn = spawnSync;
  }

  (cp as any).ChildProcess.prototype.spawn = wrapInternalSpawn(spawn, ctx);
  (process as any).binding("spawn_sync").spawn = wrapInternalSpawn(spawnSync, ctx);

  return unpatch;
}
