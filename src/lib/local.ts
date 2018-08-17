import cp from "child_process";
import { SwContext, SwOptions, withWrapContextSync } from "./context";
import { wrapSpawn } from "./wrap";

export type SyncApi = Pick<typeof cp, "spawnSync">;
export type Api = SyncApi & Pick<typeof cp, "spawn">;

export function withSpawnWrap<R = any>(options: SwOptions, handler: (api: Api) => Promise<R>): Promise<R> {
  return withWrapContextSync(options, (ctx: SwContext) => {
    return handler(wrapApi(ctx));
  });
}

export function withSpawnWrapSync<R = any>(options: SwOptions, handler: (api: SyncApi) => R): R {
  return withWrapContextSync(options, (ctx: SwContext) => {
    return handler(wrapSyncApi(ctx));
  });
}

function wrapApi(ctx: SwContext, api: Api = cp): Api {
  return {
    ...wrapSyncApi(ctx, api),
    spawn: wrapSpawn(ctx, api.spawn.bind(api)),
  };
}

function wrapSyncApi(ctx: SwContext, api: Api = cp): SyncApi {
  return {
    spawnSync: wrapSpawn(ctx, api.spawnSync.bind(api)),
  };
}
