'use strict';

const isWindows = require("is-windows")
const path = require("path")
const {debug} = require("../debug")
const {isNode} = require("../exe-type")
const {whichOrUndefined} = require("../which-or-undefined")



function mungeSh(workingDir, options) {
  const cmdi = options.args.indexOf('-c')
  if (cmdi === -1) {
    return // no -c argument
  }

  let c = options.args[cmdi + 1]
  const re = /^\s*((?:[^\= ]*\=[^\=\s]*)*[\s]*)([^\s]+|"[^"]+"|'[^']+')( .*)?$/
  const match = c.match(re)
  if (match === null) {
    return // not a command invocation.  weird but possible
  }

  let command = match[2]
  // strip quotes off the command
  const quote = command.charAt(0)
  if ((quote === '"' || quote === '\'') && quote === command.slice(-1)) {
    command = command.slice(1, -1)
  }
  const exe = path.basename(command)

  if (isNode(exe)) {
    options.originalNode = command
    c = match[1] + match[2] + ' "' + workingDir + '/node" ' + match[3]
    options.args[cmdi + 1] = c
  } else if (exe === 'npm' && !isWindows()) {
    // XXX this will exhibit weird behavior when using /path/to/npm,
    // if some other npm is first in the path.
    const npmPath = whichOrUndefined('npm')

    if (npmPath) {
      c = c.replace(re, '$1 "' + workingDir + '/node" "' + npmPath + '" $3')
      options.args[cmdi + 1] = c
      debug('npm munge!', c)
    }
  }
}

module.exports = {
  mungeSh,
}
