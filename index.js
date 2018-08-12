const {legacyWrap, wrapGlobal, runMain} = require('./lib/index')

module.exports = legacyWrap
Object.assign(module.exports, {runMain, wrapGlobal})
