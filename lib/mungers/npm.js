'use strict';

const path = require("path")
const {debug} = require("../debug")
const {whichOrUndefined} = require("../which-or-undefined")

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

module.exports = {
  mungeNpm,
}
