const {debug} = require('./debug')
const {internalMunge} = require('./munge')

/**
 * childProcess.ChildProcess.prototype.spawn
 * process.binding('spawn_sync').spawn
 */
function wrapInternalSpawn (fn, ctx) {
  return wrappedSpawn

  function wrappedSpawn (options) {
    internalMunge(ctx.shimDir, options)
    debug('WRAPPED', options)
    return fn.call(this, options)
  }
}

/**
 * childProcess.spawn
 */
function wrapSpawn (fn, ctx) {
  return wrappedSpawnSync

  function wrappedSpawnSync (...args) {
    throw new Error('NotImplemented')
  }
}

/**
 * childProcess.spawnSync
 */
function wrapSpawnSync (fn, ctx) {
  return wrappedSpawnSync

  function wrappedSpawnSync (...args) {
    throw new Error('NotImplemented')
  }
}

module.exports = {
  wrapInternalSpawn,
  wrapSpawn,
  wrapSpawnSync
}
