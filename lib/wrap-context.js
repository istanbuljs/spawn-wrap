const assert = require('assert')
const crypto = require('crypto')
const fs = require('fs')
const isWindows = require('is-windows')
const path = require('path')
const osHomedir = require('os-homedir')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const signalExit = require('signal-exit')
const {debug} = require('./debug')
const {getExeName} = require('./exe-type')
const {getCmdShim, getShim} = require('./shim/index')

function withWrapContext (options, handler) {
  return createWrapContext(options)
    .then((ctx) => {
      signalExit(() => destroyWrapContextSync(ctx))
      return Promise.resolve(ctx)
        .then(handler)
        .then(
          (res) => destroyWrapContext(ctx).then(() => res),
          (err) => destroyWrapContext(ctx).then(() => Promise.reject(err))
        )
    })
}

function withWrapContextSync (options, handler) {
  const ctx = createWrapContextSync(options)
  signalExit(() => destroyWrapContextSync(ctx))
  try {
    return handler()
  } finally {
    destroyWrapContextSync(ctx)
  }
}

function realpathMkdirp (path) {
  const mkdirpPromise = new Promise((resolve, reject) => {
    mkdirp(path, (err) => {
      if (err !== null) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
  return mkdirpPromise.then(() => {
    return new Promise((resolve, reject) => {
      fs.realpath(path, (err, res) => {
        if (err !== null) {
          reject(err)
        } else {
          return res
        }
      })
    })
  })
}

function realpathMkdirpSync (path) {
  mkdirp.sync(path)
  return fs.realpathSync(path)
}

function getShimRoot () {
  const envShimRoot = process.env.SPAWN_WRAP_SHIM_ROOT
  if (envShimRoot !== undefined) {
    return envShimRoot
  }
  return path.join(osHomedir(), '.node-spawn-wrap')
}

function createWrapContext (options) {
  return new Promise(resolve => resolve(resolveOptions(options)))
    .then((resolved) => {
      return realpathMkdirp(resolved.shimDir)
        .then(shimDirRealPath => {
          resolved.shimDir = shimDirRealPath
          return resolved
        })
    })
    .then(resolvedOptionsToContext)
    .then((context) => {
      return writeWrapContext(context)
        .then(() => context)
    })
}

function createWrapContextSync (options) {
  const resolved = resolveOptions(options)
  resolved.shimDir = realpathMkdirpSync(resolved.shimDir)
  const context = resolvedOptionsToContext(resolved)
  writeWrapContextSync(context)
  return context
}

function destroyWrapContext (ctx) {
  return new Promise((resolve, reject) => {
    return rimraf(ctx.shimDir, (err) => {
      if (err !== null) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

function destroyWrapContextSync (ctx) {
  rimraf.sync(ctx.shimDir)
}

/**
 *
 * @param options {{args?: string[], env?: object, shimRoot?: string}}
 * @return {{key: string, shimDir: string | *}}
 */
function resolveOptions (options) {
  assert(
    !(options.args === undefined && options.env === undefined),
    'at least one of "args" or "env" is required'
  )
  assert(
    options.args === undefined || Array.isArray(options.args),
    'args must be an array or undefined'
  )
  assert(
    options.env === undefined || (typeof options.env === 'object' && options.env !== null),
    'env must be an object or undefined'
  )
  assert(
    options.shimRoot === undefined || typeof options.shimRoot === 'string',
    'shimRoot must be a string or undefined'
  )

  const args = options.args !== undefined ? [...options.args] : []
  const env = options.env !== undefined ? Object.assign({}, options.env) : {}
  const shimRoot = options.shimRoot !== undefined ? options.shimRoot : getShimRoot()

  debug('resolveOptions args=%j env=%j shimRoot=%j', args, env, shimRoot)

  const key = `${process.pid}-${crypto.randomBytes(8).toString('hex')}`
  const shimDir = path.join(shimRoot, key)

  // For stuff like --use_strict or --harmony, we need to inject
  // the argument *before* the wrap-main.
  const execArgs = []
  for (let i = 0; i < args.length; i++) {
    if (args[i].match(/^-/)) {
      execArgs.push(args[i])
      if (args[i] === '-r' || args[i] === '--require') {
        execArgs.push(args[++i])
      }
    } else {
      break
    }
  }
  args.splice(0, execArgs.length)

  return {
    args,
    execArgs,
    env,
    key,
    shimDir
  }
}

function resolvedOptionsToContext (resolved) {
  return Object.freeze({
    module: require.resolve('../index'),
    deps: Object.freeze({
      foregroundChild: require.resolve('foreground-child'),
      isWindows: require.resolve('is-windows'),
      signalExit: require.resolve('signal-exit')
    }),
    key: resolved.key,
    shimDir: resolved.shimDir,
    argv: resolved.args,
    execArgv: resolved.execArgs,
    env: resolved.env,
    root: Object.freeze({
      execPath: process.execPath,
      pid: process.pid
    })
  })
}

function writeWrapContext (context) {
  const promises = []

  const names = new Set(['node', getExeName(context.root.execPath)])

  const shim = getShim(context)
  for (const name of names) {
    promises.push(writeExecutable(path.join(context.shimDir, name), shim))
  }

  if (isWindows()) {
    const cmdShim = getCmdShim(context)
    for (const name of names) {
      promises.push(writeExecutable(path.join(context.shimDir, `${name}.cmd`), cmdShim))
    }
  }

  return Promise.all(promises).then(() => undefined)
}

function writeWrapContextSync (context) {
  const names = new Set(['node', getExeName(context.root.execPath)])

  const shim = getShim(context)
  for (const name of names) {
    writeExecutableSync(path.join(context.shimDir, name), shim)
  }

  if (isWindows()) {
    const cmdShim = getCmdShim(context)
    for (const name of names) {
      writeExecutableSync(path.join(context.shimDir, `${name}.cmd`), cmdShim)
    }
  }
}

function writeExecutable (path, content) {
  return writeFile(path, content, 'utf8')
    .then(() => chmod(path, '0755'))
}

function writeExecutableSync (path, content) {
  fs.writeFileSync(path, content, 'utf8')
  fs.chmodSync(path, '0755')
}

// Promise-based `fs.writeFile`
function writeFile (path, content, encoding) {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, content, encoding, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

// Promise-based `fs.chmod`
function chmod (path, mode) {
  return new Promise((resolve, reject) => {
    fs.chmod(path, mode, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

module.exports = {
  withWrapContext,
  withWrapContextSync,
  createWrapContext,
  createWrapContextSync,
  destroyWrapContext,
  destroyWrapContextSync
}
