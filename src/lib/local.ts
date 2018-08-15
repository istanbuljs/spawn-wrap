import cp from 'child_process'
import {withWrapContextSync} from './context'
import {wrapSpawn, wrapSpawnSync} from './wrap'

export function withSpawnWrap (options: any, handler: any) {
  return withWrapContextSync(options, (ctx: any) => {
    return handler(createApi(ctx))
  })
}

export function withSpawnWrapSync (options: any, handler: any) {
  return withWrapContextSync(options, (ctx: any) => {
    return handler(createSyncApi(ctx))
  })
}

function createApi (ctx: any) {
  const api = {
    spawn: wrapSpawn(cp.spawn, ctx)
  }
  Object.assign(api, createSyncApi(ctx))
  return api
}

function createSyncApi (ctx: any) {
  return {
    spawnSync: wrapSpawnSync(cp.spawnSync, ctx)
  }
}
