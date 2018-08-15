const path = require('path')
const {debug} = require('../debug')
const {whichOrUndefined} = require('../which-or-undefined')

function mungeNode (workingDir, options) {
  options.originalNode = options.file
  const command = path.basename(options.file).replace(/\.exe$/i, '')
  // make sure it has a main script.
  // otherwise, just let it through.
  let a = 0
  let hasMain = false
  let mainIndex = 1
  for (a = 1; !hasMain && a < options.args.length; a++) {
    switch (options.args[a]) {
      case '-p':
      case '-i':
      case '--interactive':
      case '--eval':
      case '-e':
      case '-pe':
        hasMain = false
        a = options.args.length
        continue

      case '-r':
      case '--require':
        a += 1
        continue

      default:
        // TODO: Double-check this part
        if (options.args[a].match(/^-/)) {
          continue
        } else {
          hasMain = true
          mainIndex = a
          a = options.args.length
          break
        }
    }
  }

  if (hasMain) {
    const replace = workingDir + '/' + command
    options.args.splice(mainIndex, 0, replace)
  }

  // If the file is just something like 'node' then that'll
  // resolve to our shim, and so to prevent double-shimming, we need
  // to resolve that here first.
  // This also handles the case where there's not a main file, like
  // `node -e 'program'`, where we want to avoid the shim entirely.
  if (options.file === options.basename) {
    const realNode = whichOrUndefined(options.file) || process.execPath
    options.file = options.args[0] = realNode
  }

  debug('mungeNode after', options.file, options.args)
}

module.exports = {
  mungeNode
}
