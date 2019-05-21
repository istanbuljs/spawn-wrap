'use strict';

const path = require("path")
const {isCmd, isNode, isNpm, isSh} = require("./exe-type")
const mungeCmd = require("./mungers/cmd")
const mungeEnv = require("./mungers/env")
const mungeNode = require("./mungers/node")
const mungeNpm = require("./mungers/npm")
const mungeSh = require("./mungers/sh")
const mungeShebang = require("./mungers/shebang")

/**
 * @typedef {object} InternalSpawnOptions Options for the internal spawn functions
 *   `childProcess.ChildProcess.prototype.spawn` and `process.binding('spawn_sync').spawn`.
 *   These are the options mapped by the `munge` function to intercept spawned processes and
 *   handle the wrapping logic.
 *
 * @property {string} file File to execute: either an absolute system-dependent path or a
 *   command name.
 * @property {string[]} args Command line arguments passed to the spawn process, including argv0.
 * @property {string | undefined} cwd Optional path to the current working directory passed to the
 *   spawned process. Default: `process.cwd()`
 * @property {boolean} windowsHide Boolean controlling if the process should be spawned as
 *   hidden (no GUI) on Windows.
 * @property {boolean} windowsVerbatimArguments Boolean controlling if Node should preprocess
 *   the CLI arguments on Windows.
 * @property {boolean} detached Boolean controlling if the child process should keep its parent
 *   alive or not.
 * @property {string[]} envPairs Array of serialized environment variable key/value pairs. The
 *   variables serialized as `key + "=" + value`.
 * @property {import("child_process").StdioOptions} stdio Stdio options, with the same semantics
 *   as the `stdio` parameter from the public API.
 * @property {number | undefined} uid User id for the spawn process, same as the `uid` parameter
 *   from the public API.
 * @property {number | undefined} gid Group id for the spawn process, same as the `gid` parameter
 *   from the public API.
 *
 * @property {string | undefined} basename Custom property only used by `spawn-wrap`. It is the
 *   basename of the file to spawn (so individual mungers don't have to duplicate the code to
 *   compute it).
 * @property {string | undefined} originalNode Custom property only used by `spawn-wrap`. It is
 *   used to remember the original Node executable that was intended to be spawned by the user.
 */

/**
 * Updates the internal spawn options to redirect the process through the shim and wrapper.
 *
 * This works on the options passed to `childProcess.ChildProcess.prototype.spawn` and
 * `process.binding('spawn_sync').spawn`.
 *
 * This function works by trying to identify the spawn process and map the options accordingly.
 * `spawn-wrap` recognizes most shells, Windows `cmd.exe`, Node and npm invocations; when spawn
 * either directly or through a script with a shebang line.
 * It also unconditionally updates the environment variables so bare `node` commands execute
 * the shim script instead of Node's binary.
 *
 * @param workingDir {string} Absolute system-dependent path to the directory containing the shim files.
 * @param options {InternalSpawnOptions} Internal spawn options to update.
 * @return {void} This function does not return any value, the options are modified in-place.
 */
function munge(workingDir, options) {
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

module.exports = munge
