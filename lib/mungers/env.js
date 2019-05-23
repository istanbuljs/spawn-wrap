'use strict';

const isWindows = require("is-windows")
const path = require("path")
const homedir = require("../homedir")

const pathRe = isWindows() ? /^PATH=/i : /^PATH=/;
const colon = isWindows() ? ';' : ':'

/**
 * Updates the environment variables to intercept `node` commands and pass down options.
 *
 * @param workingDir {string} Absolute system-dependent path to the directory containing the shim files.
 * @param options {import("../munge").InternalSpawnOptions} Internal spawn options to update.
 * @return {void} This function does not return any value, the options are modified in-place.
 */
function mungeEnv(workingDir, options) {
  let pathEnv
  for (let i = 0; i < options.envPairs.length; i++) {
    const ep = options.envPairs[i]
    if (pathRe.test(ep)) {
      pathEnv = ep.substr(5)
      const k = ep.substr(0, 5)
      options.envPairs[i] = k + workingDir + colon + pathEnv
    }
  }
  if (pathEnv === undefined) {
    options.envPairs.push((isWindows() ? 'Path=' : 'PATH=') + workingDir)
  }
  if (options.originalNode) {
    const key = path.basename(workingDir).substr('.node-spawn-wrap-'.length)
    options.envPairs.push('SW_ORIG_' + key + '=' + options.originalNode)
  }

  options.envPairs.push('SPAWN_WRAP_SHIM_ROOT=' + homedir)

  if (process.env.SPAWN_WRAP_DEBUG === '1') {
    options.envPairs.push('SPAWN_WRAP_DEBUG=1')
  }
}

module.exports = mungeEnv
