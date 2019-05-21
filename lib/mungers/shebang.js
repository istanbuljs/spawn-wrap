'use strict';

const fs = require("fs")
const path = require("path")
const {isNode} = require("../exe-type")
const whichOrUndefined = require("../which-or-undefined")

/**
 * Intercepts processes spawned through a script with a shebang line.
 *
 * @param workingDir {string} Absolute system-dependent path to the directory containing the shim files.
 * @param options {import("../munge").InternalSpawnOptions} Internal spawn options to update.
 * @return {void} This function does not return any value, the options are modified in-place.
 */
function mungeShebang(workingDir, options) {
  const resolved = whichOrUndefined(options.file)
  if (resolved === undefined) {
    return
  }

  const shebang = fs.readFileSync(resolved, 'utf8')
  const match = shebang.match(/^#!([^\r\n]+)/)
  if (!match) {
    return // not a shebang script, probably a binary
  }

  const shebangbin = match[1].split(' ')[0]
  const maybeNode = path.basename(shebangbin)
  if (!isNode(maybeNode)) {
    return // not a node shebang, leave untouched
  }

  options.originalNode = shebangbin
  options.basename = maybeNode
  options.file = shebangbin
  options.args = [shebangbin, workingDir + '/' + maybeNode]
    .concat(resolved)
    .concat(match[1].split(' ').slice(1))
    .concat(options.args.slice(1))
}

module.exports = mungeShebang
