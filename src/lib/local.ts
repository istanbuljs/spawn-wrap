import cp from "child_process";
import { SwContext, SwOptions, withWrapContextSync } from "./context";
import { wrapSpawn, wrapSpawnSync } from "./wrap";

export type SyncApi = Pick<typeof cp, "spawnSync">;
export type Api = SyncApi & Pick<typeof cp, "spawn">;

export function withSpawnWrap<R = any>(options: SwOptions, handler: (api: Api) => Promise<R>): Promise<R> {
  return withWrapContextSync(options, (ctx: any) => {
    return handler(createApi(ctx));
  });
}

export function withSpawnWrapSync<R = any>(options: SwOptions, handler: (api: SyncApi) => R): R {
  return withWrapContextSync(options, (ctx: any) => {
    return handler(createSyncApi(ctx));
  });
}

function createApi(ctx: SwContext): Api {
  return {
    ...createSyncApi(ctx),
    spawn: wrapSpawn(cp.spawn, ctx),
  };
}

function createSyncApi(ctx: SwContext): SyncApi {
  return {
    spawnSync: wrapSpawnSync(cp.spawnSync, ctx),
  };
}
