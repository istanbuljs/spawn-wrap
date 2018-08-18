import assert from "assert";
import crypto from "crypto";
import fs from "fs";
import isWindows from "is-windows";
import mkdirp from "mkdirp";
import osHomedir from "os-homedir";
import path from "path";
import rimraf from "rimraf";
import signalExit from "signal-exit";
import { debug } from "./debug";
import { getExeBasename } from "./exe-type";
import { getCmdShim, getPreload, getShim } from "./shim";

const DEFAULT_SHIM_ROOT_NAME = ".node-spawn-wrap";
const SHIM_ROOT_ENV_VAR = "SPAWN_WRAP_SHIM_ROOT";

/**
 * Spawn wrap context.
 */
export interface SwContext {
  /**
   * Absolute system path for the `spawn-wrap` main module.
   */
  readonly module: string;

  /**
   * Absolute system path for the corresponding dependencies.
   */
  readonly deps: Readonly<Record<"foregroundChild" | "isWindows" | "signalExit", string>>;

  /**
   * Unique key identifying this context.
   */
  readonly key: string;

  /**
   * Directory containing the shims.
   */
  readonly shimDir: string;

  /**
   * Path to the canonical shim script.
   *
   * You can use it when invoking the real node:
   * ```
   * spawn(process.execPath, [shimScript, "foo.js"])
   * ```
   *
   * This corresponds to `node` inside the shimDir.
   */
  readonly shimScript: string;

  /**
   * Path to the canonical shim executable.
   *
   * You can use it instead of the real node:
   * ```
   * spawn(shimExecutable, ["foo.js"])
   * ```
   *
   * This corresponds to `node` or `node.cmd` inside the shimDir (depending on
   * the platform).
   */
  readonly shimExecutable: string;

  readonly preloadScript: string;

  readonly args: ReadonlyArray<string>;

  readonly execArgs: ReadonlyArray<string>;

  readonly env: Readonly<Record<string, string>>;

  readonly mode: "run" | "spawn";

  /**
   * Information about the root process.
   *
   * The root process is the process that created the context.
   */
  readonly root: {
    readonly execPath: string;
    readonly pid: number;
  };
}

export interface SwOptions {
  /**
   * Node arguments for the wrapper.
   */
  args?: string[];

  /**
   * Additional environment variables.
   */
  env?: Record<string, string>;

  /**
   * Location where the shim directories will be created.
   *
   * Default:
   * - If the env var `SPAWN_WRAP_SHIM_ROOT`, use its value
   * - Otherwise, `.node-spawn-wrap` directory inside user's home dir.
   */
  shimRoot?: string;

  /**
   * How you intend to execute the main script when inside the wrapper.
   * - `run`: `spawnWrap.runMain()`
   * - `spawn`: `spawnWrap.spawnMain()`
   */
  mode?: "run" | "spawn";
}

/**
 * @internal
 */
interface ResolvedOptions {
  args: string[];
  env: Record<string, string>;
  execArgs: string[];
  key: string;
  shimDir: string;
  mode: "run" | "spawn";
}

export function withWrapContext<R = any>(options: SwOptions, handler: (ctx: SwContext) => Promise<R>): Promise<R> {
  return createWrapContext(options)
    .then((ctx: SwContext) => {
      signalExit(() => destroyWrapContextSync(ctx));
      return Promise.resolve(ctx)
        .then(handler)
        .then(
          (res) => destroyWrapContext(ctx).then(() => res),
          (err) => destroyWrapContext(ctx).then(() => Promise.reject(err)),
        );
    });
}

export function withWrapContextSync<R = any>(options: SwOptions, handler: (ctx: SwContext) => R): R {
  const ctx = createWrapContextSync(options);
  signalExit(() => destroyWrapContextSync(ctx));
  try {
    return handler(ctx);
  } finally {
    destroyWrapContextSync(ctx);
  }
}

/**
 * Creates a directory (recursively) and returns its real path.
 *
 * @param path Path of the directory to create.
 * @return Real path of the directory.
 */
async function realpathMkdirp(path: string): Promise<string> {
  await new Promise((resolve, reject) => {
    mkdirp(path, (err) => {
      if (err !== null) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
  return new Promise<string>((resolve, reject) => {
    fs.realpath(path, (err, res) => {
      if (err !== null) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
}

/**
 * Synchronous version of [[realpathMkdirp]].
 */
function realpathMkdirpSync(path: string): string {
  mkdirp.sync(path);
  return fs.realpathSync(path);
}

/**
 * Retuns the default shim root.
 *
 * If the environment variable `SPAWN_WRAP_SHIM_ROOT` is defined, it returns
 * its value. Otherwise, it returns the directory `.node-spawn-wrap` in the
 * user's home.
 */
function getShimRoot(): string {
  const envShimRoot = process.env[SHIM_ROOT_ENV_VAR];
  if (envShimRoot !== undefined) {
    return envShimRoot;
  }
  return path.join(osHomedir(), DEFAULT_SHIM_ROOT_NAME);
}

export async function createWrapContext(options: SwOptions): Promise<SwContext> {
  const resolved = resolveOptions(options);
  resolved.shimDir = await realpathMkdirp(resolved.shimDir);
  const ctx = resolvedOptionsToContext(resolved);
  await writeWrapContext(ctx);
  return ctx;
}

export function createWrapContextSync(options: SwOptions): SwContext {
  const resolved = resolveOptions(options);
  resolved.shimDir = realpathMkdirpSync(resolved.shimDir);
  const ctx = resolvedOptionsToContext(resolved);
  writeWrapContextSync(ctx);
  return ctx;
}

export function destroyWrapContext(ctx: SwContext): Promise<void> {
  return new Promise((resolve, reject) => {
    return rimraf(ctx.shimDir, (err) => {
      if (err !== null) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export function destroyWrapContextSync(ctx: SwContext): void {
  rimraf.sync(ctx.shimDir);
}

/**
 *
 * @param options {{args?: string[], env?: object, shimRoot?: string}}
 * @return {{key: string, shimDir: string | *}}
 */
function resolveOptions(options: SwOptions): ResolvedOptions {
  assert(
    !(options.args === undefined && options.env === undefined),
    "at least one of \"args\" or \"env\" is required",
  );
  assert(
    options.args === undefined || Array.isArray(options.args),
    "args must be an array or undefined",
  );
  assert(
    options.env === undefined || (typeof options.env === "object" && options.env !== null),
    "env must be an object or undefined",
  );
  assert(
    options.shimRoot === undefined || typeof options.shimRoot === "string",
    "shimRoot must be a string or undefined",
  );

  const args = options.args !== undefined ? [...options.args] : [];
  const env = options.env !== undefined ? Object.assign({}, options.env) : {};
  const shimRoot = options.shimRoot !== undefined ? options.shimRoot : getShimRoot();
  const mode: "run" | "spawn" = options.mode !== undefined ? options.mode : "run";

  debug("resolveOptions args=%j env=%j shimRoot=%j", args, env, shimRoot);

  const key = `${process.pid}-${crypto.randomBytes(8).toString("hex")}`;
  const shimDir = path.join(shimRoot, key);

  // For stuff like --use_strict or --harmony, we need to inject
  // the argument *before* the wrap-main.
  const execArgs = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].match(/^-/)) {
      execArgs.push(args[i]);
      if (args[i] === "-r" || args[i] === "--require") {
        execArgs.push(args[++i]);
      }
    } else {
      break;
    }
  }
  args.splice(0, execArgs.length);

  return {
    args,
    execArgs,
    env,
    key,
    shimDir,
    mode,
  };
}

function resolvedOptionsToContext(resolved: ResolvedOptions): SwContext {
  return Object.freeze({
    module: require.resolve("./index"),
    deps: Object.freeze({
      foregroundChild: require.resolve("foreground-child"),
      isWindows: require.resolve("is-windows"),
      signalExit: require.resolve("signal-exit"),
    }),
    key: resolved.key,
    shimDir: resolved.shimDir,
    shimScript: path.join(resolved.shimDir, "node"),
    shimExecutable: path.join(resolved.shimDir, isWindows() ? "node.cmd" : "node"),
    preloadScript: path.join(resolved.shimDir, "preload.js"),
    args: Object.freeze(resolved.args),
    execArgs: Object.freeze(resolved.execArgs),
    env: Object.freeze(resolved.env),
    mode: resolved.mode,
    root: Object.freeze({
      execPath: process.execPath,
      pid: process.pid,
    }),
  });
}

function writeWrapContext(ctx: SwContext): Promise<void> {
  const promises = [];

  const names = new Set(["node", getExeBasename(ctx.root.execPath)]);

  promises.push(writeFile(ctx.preloadScript, getPreload(ctx), "UTF-8"));

  const shim = getShim(ctx);
  for (const name of names) {
    promises.push(writeExecutable(path.join(ctx.shimDir, name), shim));
  }

  if (isWindows()) {
    const cmdShim = getCmdShim(ctx);
    for (const name of names) {
      promises.push(writeExecutable(path.join(ctx.shimDir, `${name}.cmd`), cmdShim));
    }
  }

  return Promise.all(promises).then(() => undefined);
}

function writeWrapContextSync(ctx: SwContext): void {
  const names = new Set(["node", getExeBasename(ctx.root.execPath)]);

  const shim = getShim(ctx);
  for (const name of names) {
    writeExecutableSync(path.join(ctx.shimDir, name), shim);
  }

  if (isWindows()) {
    const cmdShim = getCmdShim(ctx);
    for (const name of names) {
      writeExecutableSync(path.join(ctx.shimDir, `${name}.cmd`), cmdShim);
    }
  }
}

function writeExecutable(path: string, content: string): Promise<void> {
  return writeFile(path, content, "utf8")
    .then(() => chmod(path, "0755"));
}

function writeExecutableSync(path: string, content: string): void {
  fs.writeFileSync(path, content, "utf8");
  fs.chmodSync(path, "0755");
}

// Promise-based `fs.writeFile`, restricted to text files
function writeFile(path: string, content: string, encoding: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, content, encoding, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// Promise-based `fs.chmod`
function chmod(path: string, mode: string | number): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.chmod(path, mode, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
