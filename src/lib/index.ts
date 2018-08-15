import { applyContextOnGlobal, legacyWrap, runMain, wrapGlobal } from "./spawn-wrap";
import { withSpawnWrap, withSpawnWrapSync } from "./local";

// TODO: Use `export` statements to properly generate `index.d.ts`
module.exports = legacyWrap;
Object.assign(module.exports, {applyContextOnGlobal, runMain, wrapGlobal, withSpawnWrap, withSpawnWrapSync});
