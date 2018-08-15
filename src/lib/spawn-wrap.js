const cp = require('child_process')
const Module = require('module')
const path = require('path')
const signalExit = require('signal-exit')
const {createWrapContextSync, destroyWrapContextSync} = require('./context')
const {IS_DEBUG} = require('./debug')
const {wrapInternalSpawn} = require('./wrap')

function legacyWrap (args, env) {
  if (typeof args === 'object' && !Array.isArray(args) && env === undefined) {
    // We were passed a single `env` object
    env = args
    args = undefined
  }
  return wrapGlobal({args, env})
}

function wrapGlobal (options) {
  const ctx = createWrapContextSync(options)
  signalExit(cleanUp)
  const unwrapApi = applyContextOnGlobal(ctx)
  return unwrap

  function cleanUp () {
    if (IS_DEBUG) {
      destroyWrapContextSync(ctx)
    }
  }

  function unwrap () {
    unwrapApi()
    cleanUp()
  }
}

function applyContextOnGlobal (ctx) {
  const spawn = cp.ChildProcess.prototype.spawn
  const spawnSync = process.binding('spawn_sync').spawn

  function unwrap () {
    cp.ChildProcess.prototype.spawn = spawn
    process.binding('spawn_sync').spawn = spawnSync
  }

  cp.ChildProcess.prototype.spawn = wrapInternalSpawn(spawn, ctx)
  process.binding('spawn_sync').spawn = wrapInternalSpawn(spawnSync, ctx)

  return unwrap
}

function runMain () {
  process.argv.splice(1, 1)
  process.argv[1] = path.resolve(process.argv[1])
  delete require.cache[process.argv[1]]
  Module.runMain()
}

module.exports = {
  applyContextOnGlobal,
  // TODO: Decorate with `deprecate`
  legacyWrap,
  runMain,
  wrapGlobal
}
