'use strict'

const path = require('path')
const {isCmd, isNode, isNpm, isSh} = require('./exe-type')
const {mungeCmd} = require('./mungers/cmd')
const {mungeEnv} = require('./mungers/env')
const {mungeNode} = require('./mungers/node')
const {mungeNpm} = require('./mungers/npm')
const {mungeSh} = require('./mungers/sh')
const {mungeShebang} = require('./mungers/shebang')

function munge (workingDir, options) {
  options.basename = path.basename(options.file).replace(/\.exe$/i, '')

  // XXX: dry this
  if (isSh(options.basename)) {
    mungeSh(workingDir, options)
  } else if (isCmd(options.basename)) {
    mungeCmd(workingDir, options)
  } else if (isNode(options.basename)) {
    mungeNode(workingDir, options)
  } else if (isNpm(options.basename)) {
    // XXX unnecessary?  on non-windows, npm is just another shebang
    mungeNpm(workingDir, options)
  } else {
    mungeShebang(workingDir, options)
  }

  // now the options are munged into shape.
  // whether we changed something or not, we still update the PATH
  // so that if a script somewhere calls `node foo`, it gets our
  // wrapper instead.

  mungeEnv(workingDir, options)
}

module.exports = {
  munge
}
