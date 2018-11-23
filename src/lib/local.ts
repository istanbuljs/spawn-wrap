import cp from "child_process";
import { SwContext, withWrapContext, withWrapContextSync } from "./context";
import { SwOptions } from "./types";
import { wrapSpawn } from "./wrap";

export type SyncApi = Pick<typeof cp, "spawnSync">;
export type Api = Partial<SyncApi> & Pick<typeof cp, "spawn">;

export interface WithSwOptions extends SwOptions {
  api?: Api;
}

export interface WithSwSyncOptions extends SwOptions {
  api?: SyncApi;
}

export function withSpawnWrap<R = any>(options: WithSwOptions, handler: (api: Api) => Promise<R>): Promise<R> {
  return withWrapContext(options, (ctx: SwContext): Promise<R> => {
    return handler(wrapApi(ctx, options.api));
  });
}

export function withSpawnWrapSync<R = any>(options: WithSwSyncOptions, handler: (api: SyncApi) => R): R {
  return withWrapContextSync(options, (ctx: SwContext) => {
    return handler(wrapSyncApi(ctx, options.api));
  });
}

function wrapApi(ctx: SwContext, api: Api = cp): Api {
  return {
    spawnSync: typeof api.spawnSync === "function" ? wrapSpawn(ctx, api.spawnSync.bind(api)) : undefined,
    spawn: wrapSpawn(ctx, api.spawn.bind(api)),
  };
}

function wrapSyncApi(ctx: SwContext, api: SyncApi = cp): SyncApi {
  return {
    spawnSync: wrapSpawn(ctx, api.spawnSync.bind(api)),
  };
}
