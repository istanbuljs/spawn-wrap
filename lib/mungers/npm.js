'use strict';

const path = require("path")
const {debug} = require("../debug")
const whichOrUndefined = require("../which-or-undefined")

/**
 * Intercepts npm spawned processes.
 *
 * @param workingDir {string} Absolute system-dependent path to the directory containing the shim files.
 * @param options {import("../munge").InternalSpawnOptions} Internal spawn options to update.
 * @return {void} This function does not return any value, the options are modified in-place.
 */
function mungeNpm(workingDir, options) {
  debug('munge npm')
  // XXX weird effects of replacing a specific npm with a global one
  const npmPath = whichOrUndefined('npm')

  if (npmPath !== undefined) {
    options.args[0] = npmPath

    const file = path.join(workingDir, 'node')
    options.file = file
    options.args.unshift(file)
  }
}

module.exports = mungeNpm
