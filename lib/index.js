const cp = require('child_process')
const Module = require('module')
const path = require('path')
const signalExit = require('signal-exit')
const {IS_DEBUG, debug} = require('./debug')
const {munge} = require('./munge')
const {createWrapContextSync, destroyWrapContextSync} = require('./wrap-context')

function legacyWrap (args, env, shimDir) {
  if (typeof args === 'object' && !Array.isArray(args) && env === undefined && shimDir === undefined) {
    // We were passed a single `env` object
    env = args
    args = undefined
  }
  return wrapGlobal({args, env}, shimDir)
}

function wrapGlobal (options, shimDir) {
  let cleanUp = () => {}
  if (shimDir === undefined) {
    const ctx = createWrapContextSync(options)
    if (!IS_DEBUG) {
      cleanUp = () => destroyWrapContextSync(ctx)
      signalExit(cleanUp)
    }
    shimDir = ctx.shimDir
  }

  const spawn = cp.ChildProcess.prototype.spawn
  const spawnSync = process.binding('spawn_sync').spawn

  function unwrap () {
    cp.ChildProcess.prototype.spawn = spawn
    process.binding('spawn_sync').spawn = spawnSync
    cleanUp()
  }

  cp.ChildProcess.prototype.spawn = wrappedSpawnFunction(spawn, shimDir)
  process.binding('spawn_sync').spawn = wrappedSpawnFunction(spawnSync, shimDir)

  return unwrap
}

function wrappedSpawnFunction (fn, workingDir) {
  return wrappedSpawn

  function wrappedSpawn (options) {
    munge(workingDir, options)
    debug('WRAPPED', options)
    return fn.call(this, options)
  }
}

function runMain () {
  process.argv.splice(1, 1)
  process.argv[1] = path.resolve(process.argv[1])
  delete require.cache[process.argv[1]]
  Module.runMain()
}

module.exports = {
  // TODO: Decorate with `deprecate`
  legacyWrap,
  runMain,
  wrapGlobal
}
