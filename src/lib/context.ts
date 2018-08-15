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
import { getExeName } from "./exe-type";
import { getCmdShim, getShim } from "./shim";

export function withWrapContext(options: any, handler: any) {
  return createWrapContext(options)
    .then((ctx: any) => {
      signalExit(() => destroyWrapContextSync(ctx));
      return Promise.resolve(ctx)
        .then(handler)
        .then(
          (res) => destroyWrapContext(ctx).then(() => res),
          (err) => destroyWrapContext(ctx).then(() => Promise.reject(err)),
        );
    });
}

export function withWrapContextSync(options: any, handler: any) {
  const ctx = createWrapContextSync(options);
  signalExit(() => destroyWrapContextSync(ctx));
  try {
    return handler(ctx);
  } finally {
    destroyWrapContextSync(ctx);
  }
}

function realpathMkdirp(path: string): Promise<string> {
  const mkdirpPromise = new Promise((resolve, reject) => {
    mkdirp(path, (err) => {
      if (err !== null) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
  return mkdirpPromise.then(() => {
    return new Promise<string>((resolve, reject) => {
      fs.realpath(path, (err, res) => {
        if (err !== null) {
          reject(err);
        } else {
          return res;
        }
      });
    });
  });
}

function realpathMkdirpSync(path: string): string {
  mkdirp.sync(path);
  return fs.realpathSync(path);
}

function getShimRoot() {
  const envShimRoot = process.env.SPAWN_WRAP_SHIM_ROOT;
  if (envShimRoot !== undefined) {
    return envShimRoot;
  }
  return path.join(osHomedir(), ".node-spawn-wrap");
}

export function createWrapContext(options: any): any {
  return new Promise((resolve) => resolve(resolveOptions(options)))
    .then((resolved: any) => {
      return realpathMkdirp(resolved.shimDir)
        .then((shimDirRealPath) => {
          resolved.shimDir = shimDirRealPath;
          return resolved;
        });
    })
    .then(resolvedOptionsToContext)
    .then((context) => {
      return writeWrapContext(context)
        .then(() => context);
    });
}

export function createWrapContextSync(options: any): any {
  const resolved = resolveOptions(options);
  resolved.shimDir = realpathMkdirpSync(resolved.shimDir);
  const context = resolvedOptionsToContext(resolved);
  writeWrapContextSync(context);
  return context;
}

export function destroyWrapContext(ctx: any): Promise<void> {
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

export function destroyWrapContextSync(ctx: any): void {
  rimraf.sync(ctx.shimDir);
}

/**
 *
 * @param options {{args?: string[], env?: object, shimRoot?: string}}
 * @return {{key: string, shimDir: string | *}}
 */
function resolveOptions(options: any) {
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
  };
}

function resolvedOptionsToContext(resolved: any) {
  return Object.freeze({
    module: require.resolve("./index"),
    deps: Object.freeze({
      foregroundChild: require.resolve("foreground-child"),
      isWindows: require.resolve("is-windows"),
      signalExit: require.resolve("signal-exit"),
    }),
    key: resolved.key,
    shimDir: resolved.shimDir,
    args: Object.freeze(resolved.args),
    execArgs: Object.freeze(resolved.execArgs),
    env: resolved.env,
    root: Object.freeze({
      execPath: process.execPath,
      pid: process.pid,
    }),
  });
}

function writeWrapContext(context: any) {
  const promises = [];

  const names = new Set(["node", getExeName(context.root.execPath)]);

  const shim = getShim(context);
  for (const name of names) {
    promises.push(writeExecutable(path.join(context.shimDir, name), shim));
  }

  if (isWindows()) {
    const cmdShim = getCmdShim(context);
    for (const name of names) {
      promises.push(writeExecutable(path.join(context.shimDir, `${name}.cmd`), cmdShim));
    }
  }

  return Promise.all(promises).then(() => undefined);
}

function writeWrapContextSync(context: any): void {
  const names = new Set(["node", getExeName(context.root.execPath)]);

  const shim = getShim(context);
  for (const name of names) {
    writeExecutableSync(path.join(context.shimDir, name), shim);
  }

  if (isWindows()) {
    const cmdShim = getCmdShim(context);
    for (const name of names) {
      writeExecutableSync(path.join(context.shimDir, `${name}.cmd`), cmdShim);
    }
  }
}

function writeExecutable(path: string, content: string) {
  return writeFile(path, content, "utf8")
    .then(() => chmod(path, "0755"));
}

function writeExecutableSync(path: string, content: string) {
  fs.writeFileSync(path, content, "utf8");
  fs.chmodSync(path, "0755");
}

// Promise-based `fs.writeFile`
function writeFile(path: string, content: string, encoding: string) {
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
function chmod(path: string, mode: string | number) {
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
