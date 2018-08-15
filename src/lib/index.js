const {applyContextOnGlobal, legacyWrap, runMain, wrapGlobal} = require('./spawn-wrap')
const {withSpawnWrap, withSpawnWrapSync} = require('./local')

module.exports = legacyWrap
Object.assign(module.exports, {applyContextOnGlobal, runMain, wrapGlobal, withSpawnWrap, withSpawnWrapSync})
