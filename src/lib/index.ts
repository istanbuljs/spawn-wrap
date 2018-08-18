import { withSpawnWrap, withSpawnWrapSync } from "./local";
import { spawn as observeSpawn } from "./observable/index";
import { applyContextOnGlobal, legacyWrap, runMain, wrapGlobal } from "./spawn-wrap";

// These TS exports are only there to generate the type definitions, they will be overwritten by the CJS exports below
export {
  applyContextOnGlobal,
  observeSpawn,
  runMain,
  wrapGlobal,
  withSpawnWrap,
  withSpawnWrapSync,
};

module.exports = legacyWrap;
Object.assign(module.exports, {
  applyContextOnGlobal,
  observeSpawn,
  runMain,
  wrapGlobal,
  withSpawnWrap,
  withSpawnWrapSync,
});
