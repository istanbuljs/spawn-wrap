'use strict'

const os = require('os')

const home = process.env.SPAWN_WRAP_SHIM_ROOT || os.homedir()
const homedir = home + '/.node-spawn-wrap-'

module.exports = homedir
