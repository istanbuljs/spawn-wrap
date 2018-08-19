import { withSpawnWrap, withSpawnWrapSync } from "./local";
import { spawn as observeSpawn } from "./observable/index";
import { applyContextOnGlobal, wrapGlobal } from "./spawn-wrap";

export {
  applyContextOnGlobal,
  observeSpawn,
  wrapGlobal,
  withSpawnWrap,
  withSpawnWrapSync,
};
