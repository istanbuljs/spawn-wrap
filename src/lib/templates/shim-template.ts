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
const {removeFromPathEnv, isPathEnvName} = require(context.deps.pathEnvVar);
const {parseNodeOptions} = require(context.deps.parseNodeOptions);
const foregroundChild = require(context.deps.foregroundChild);
const isWindows = require(context.deps.isWindows);
const spawnWrap = require(context.module);
const Module = require("module");
const path = require("path");

/**
 * Runs the shim
 *
 * The shim may be invoked as one of the following ways:
 *
 * ```
 * # sameProcess mode and patched spawn call:
 * /path/to/bin/node ...execArgs -- /path/to/shim.js main.js ...args
 * # subProcess mode and patched spawn call:
 * /path/to/bin/node -- /path/to/shim.js ...execArgs main.js ...args
 * # Unpatched call (for example intercepted using the PATH)
 * /path/to/bin/node /path/to/shim.js ...execArgs main.js ...args
 * ```
 */
function shimMain() {
  if (module !== require.main) {
    throw new Error("spawn-wrap: cli wrapper invoked as non-main script");
  }
  debug("shim", [process.argv[0]].concat(process.execArgv, process.argv.slice(1)));

  const originalArgs: ReadonlyArray<string> = process.argv.slice(2);

  let args: ReadonlyArray<string>;

  if (context.sameProcess) {
    // user args: no exec args and no shim path
    const userArgs: ReadonlyArray<string> = [process.argv[0]].concat(originalArgs);
    const parsed: any = parseNodeOptions(userArgs);
    if (parsed.appArgs.length === 0 || parsed.hasEval || parsed.hasInteractive) {
      // Avoid running the wrapper in same process mode if node is used without a script
      // Can happen for example if we intercept `node -e <...>`
      debug("no main file!");
      foregroundChild(process.execPath, originalArgs);
      return;
    }
    if (parsed.execArgs.length > 0) {
      // `process.argv` starts with some non-applied exec args: we need to spawn
      // a subprocess to apply them.
      const fixedArgs: ReadonlyArray<string> = [
        ...withoutTrailingDoubleDash(process.execArgv),
        parsed.execArgs,
        "--",
        __filename,
        ...parsed.appArgs,
      ];
      foregroundChild(process.execPath, fixedArgs);
      return;
    }
    // If we reached this point, it means that we were called as:
    // `/path/to/node ...execArgs /path/to/shim ...userAppArgs`
    args = [...originalArgs];
  } else {
    // Subprocess mode
    // `process.execArgv` should be empty or `--` so we only pass the user args.
    // Which will contain the user exec args and app args.
    // If we wanted to add it, it should be passed to withoutTrailingDoubleDash
    // first to ensure that the user exec args are still applied.
    args = [...originalArgs];
  }

  // This will be insert again when a process is spawned through a patched spawn.
  removeShimDirFromPath();

  const wrapperApi: WrapperApi = {
    context,
    args: Object.freeze(args),
  };

  // Replace the shim script with the wrapper so it looks like the main
  process.argv.splice(1, 1, context.wrapper);

  if (context.sameProcess) {
    spawnWrap.patchInternalsWithContext(context);

    function runMain(): void {
      // Remove the wrapper, so the real main looks like the main module
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

function withoutTrailingDoubleDash(args: ReadonlyArray<string>): ReadonlyArray<string> {
  if (args.length > 0 && args[args.length - 1] === "--") {
    return args.slice(0, args.length - 1);
  }
  return args;
}

shimMain();
