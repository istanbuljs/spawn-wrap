// This module should *only* be loaded as a main script
// by child processes wrapped by spawn-wrap.  It sets up
// argv to include the injected argv (including the user's
// wrapper script) and any environment variables specified.
//
// If any argv were passed in (ie, if it's used to force
// a wrapper script, and not just ensure that an env is kept
// around through all the child procs), then we also set up
// a require('spawn-wrap').runMain() function that will strip
// off the injected arguments and run the main file.

import { SwContext } from "../context";
import { WrapperApi } from "../types";

declare const context: SwContext;
/* global context */

/* shim-template-include: context */

// tslint:disable:no-var-requires
const {debug} = require(context.deps.debug);
const {getMainIndex} = require(context.deps.nodeCli);
const {removeFromPathEnv, isPathEnvName} = require(context.deps.pathEnvVar);
const foregroundChild = require(context.deps.foregroundChild);
const isWindows = require(context.deps.isWindows);
const spawnWrap = require(context.module);
const Module = require("module");
const path = require("path");

function shimMain() {
  if (module !== require.main) {
    throw new Error("spawn-wrap: cli wrapper invoked as non-main script");
  }
  debug("shim", [process.argv[0]].concat(process.execArgv, process.argv.slice(1)));

  const originalArgs: ReadonlyArray<string> = process.argv.slice(2);

  // Argv coming in looks like:
  // bin shim execArgv main argv
  //
  // Turn it into:
  // bin context.execArgv execArgv context.argv main argv
  //
  // If we don't have a main script, then just run with the necessary
  // execArgv
  const mainIdx: number | undefined = getMainIndex(originalArgs);
  debug("after argv parse mainIdx=%j", mainIdx);

  if (context.sameProcess) {
    if (mainIdx === undefined) {
      // we got loaded by mistake for a `node -pe script` or something.
      debug("no main file!", originalArgs);
      foregroundChild(process.execPath, originalArgs);
      return;
    }

    // Ensure that the execArgv are properly set for the child process.
    // This requires spawning a subProcess, even in `sameProcess` mode.
    if (mainIdx > 0) {
      const subArgs: ReadonlyArray<string> = [
        ...originalArgs.slice(0, mainIdx),
        __filename,
        ...originalArgs.slice(mainIdx),
      ];
      foregroundChild(process.execPath, subArgs);
      return;
    }
  }

  // This will be readded when a process is spawned through a patched spawn.
  removeShimDirFromPath();

  const wrapperApi: WrapperApi = {
    context,
    args: Object.freeze([...originalArgs]),
  };

  // Replace the shim script with the wrapper so it looks like the main
  process.argv.splice(1, 1, context.wrapper);

  if (context.sameProcess) {
    spawnWrap.patchInternalsWithContext(context);

    function runMain(): void {
      // Remove the wrapper, so the real main looks like the main
      process.argv.splice(1, 1);
      const main: string = path.resolve(process.argv[1]);
      delete require.cache[main];
      Module.runMain();
    }

    wrapperApi.runMain = runMain;
  }

  const wrapperMain: ((wrapperApi: WrapperApi) => any) | undefined = requireWrapper();
  if (wrapperMain !== undefined) {
    wrapperMain(wrapperApi);
  }
}

function removeShimDirFromPath(): void {
  // Unwrap the PATH environment var so that we're not mucking
  // with the environment.  It'll get re-added if they spawn anything
  // Deliberately iterate over prototype keys
  for (const name in process.env) {
    if (!isPathEnvName(name)) {
      continue;
    }
    const value = process.env[name];
    process.env[name] = removeFromPathEnv(value, __dirname);
  }
}

/**
 * Requires the wrapper and returns its `main` if available.
 */
function requireWrapper(): ((wrapperApi: WrapperApi) => any) | undefined {
  const wrapperPath: string = context.wrapper;
  const wrapper: any = require(wrapperPath);
  if (typeof wrapper === "function") {
    return wrapper;
  } else if (typeof wrapper === "object" && wrapper !== null && typeof wrapper.default === "function") {
    return wrapper.default;
  }
}

shimMain();
