const {applyContextOnGlobal, legacyWrap, runMain, wrapGlobal} = require('./lib/index')

module.exports = legacyWrap
Object.assign(module.exports, {applyContextOnGlobal, runMain, wrapGlobal})
