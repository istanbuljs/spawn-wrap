const cp = require('child_process')
const {withWrapContextSync} = require('./context')
const {wrapSpawn, wrapSpawnSync} = require('./wrap')

function withSpawnWrap (options, handler) {
  return withWrapContextSync(options, (ctx) => {
    return handler(createApi(ctx))
  })
}

function withSpawnWrapSync (options, handler) {
  return withWrapContextSync(options, (ctx) => {
    return handler(createSyncApi(ctx))
  })
}

function createApi (ctx) {
  const api = {
    spawn: wrapSpawn(cp.spawn, ctx)
  }
  Object.assign(api, createSyncApi(ctx))
  return api
}

function createSyncApi (ctx) {
  return {
    spawnSync: wrapSpawnSync(cp.spawnSync, ctx)
  }
}

module.exports = {
  withSpawnWrap,
  withSpawnWrapSync
}
