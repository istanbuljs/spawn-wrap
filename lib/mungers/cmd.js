'use strict';

const path = require("path")
const {whichOrUndefined} = require("../which-or-undefined")

function mungeCmd(workingDir, options) {
  const cmdi = options.args.indexOf('/c')
  if (cmdi === -1) {
    return
  }

  const re = /^\s*("*)([^"]*?\bnode(?:\.exe|\.EXE)?)("*)( .*)?$/
  const npmre = /^\s*("*)([^"]*?\b(?:npm))("*)( |$)/

  const command = options.args[cmdi + 1]
  if (command === undefined) {
    return
  }

  let m = command.match(re)
  let replace
  if (m) {
    options.originalNode = m[2]
    // TODO: Remove `replace`: seems unused
    replace = m[1] + workingDir + '/node.cmd' + m[3] + m[4]
    options.args[cmdi + 1] = m[1] + m[2] + m[3] +
      ' "' + workingDir + '\\node"' + m[4]
  } else {
    // XXX probably not a good idea to rewrite to the first npm in the
    // path if it's a full path to npm.  And if it's not a full path to
    // npm, then the dirname will not work properly!
    m = command.match(npmre)
    if (m === null) {
      return
    }

    let npmPath = whichOrUndefined('npm') || 'npm'
    npmPath = path.dirname(npmPath) + '\\node_modules\\npm\\bin\\npm-cli.js'
    replace = m[1] + workingDir + '/node.cmd' +
      ' "' + npmPath + '"' +
      m[3] + m[4]
    options.args[cmdi + 1] = command.replace(npmre, replace)
  }
}

module.exports = {
  mungeCmd,
}
