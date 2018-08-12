'use strict'

const osHomedir = require('os-homedir')

const home = process.env.SPAWN_WRAP_SHIM_ROOT || osHomedir()
const homedir = home + '/.node-spawn-wrap-'

module.exports = {
  homedir
}
