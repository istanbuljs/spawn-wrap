const {applyContextOnGlobal, legacyWrap, runMain, wrapGlobal} = require('./lib/index')
const {withSpawnWrap, withSpawnWrapSync} = require('./lib/local')

module.exports = legacyWrap
Object.assign(module.exports, {applyContextOnGlobal, runMain, wrapGlobal, withSpawnWrap, withSpawnWrapSync})
