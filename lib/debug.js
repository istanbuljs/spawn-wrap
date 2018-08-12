'use strict';

/**
 * Boolean indicating if debug mode is enabled.
 *
 * @type {boolean}
 */
const IS_DEBUG = process.env.SPAWN_WRAP_DEBUG === '1'

/**
 * If debug is enabled, write message to standard error.
 *
 * If debug is disabled, no message is written.
 */
function debug() {
  if (!IS_DEBUG) {
    return;
  }
  const prefix = 'SW ' + process.pid + ': '
  const data = util.format.apply(util, arguments).trim()
  const message = prefix + data.split('\n').join('\n' + prefix)
  process.stderr.write(message + '\n')
}

module.exports = {
  IS_DEBUG,
  debug,
}
