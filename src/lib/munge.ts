import path from 'path'
import {isCmd, isNode, isNpm, isSh} from './exe-type'
import {mungeCmd} from './mungers/cmd'
import {mungeEnv} from './mungers/env'
import {mungeNode} from './mungers/node'
import {mungeNpm} from './mungers/npm'
import {mungeSh} from './mungers/sh'
import {mungeShebang} from './mungers/shebang'

/**
 * childProcess.ChildProcess.prototype.spawn
 * process.binding('spawn_sync').spawn
 */
export function internalMunge (workingDir: string, options: any) {
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

/**
 * childProcess.spawn
 */
export function spawnMunge (workingDir: string, options: any) {
  throw new Error('NotImplemented')
}

/**
 * childProcess.spawnSync
 */
export function spawnSyncMunge (workingDir: string, options: any) {
  throw new Error('NotImplemented')
}
