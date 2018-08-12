module.exports = wrap
wrap.runMain = runMain

const Module = require('module')
const fs = require('fs')
const cp = require('child_process')
const ChildProcess = cp.ChildProcess
const assert = require('assert')
const crypto = require('crypto')
const IS_WINDOWS = require('is-windows')()
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const path = require('path')
const signalExit = require('signal-exit')
const home = process.env.SPAWN_WRAP_SHIM_ROOT || require('os-homedir')()
const homedir = home + '/.node-spawn-wrap-'
const which = require('which')
const util = require('util')

const doDebug = process.env.SPAWN_WRAP_DEBUG === '1'

function debug () {
  if (!doDebug) {
    return
  }
  const prefix = 'SW ' + process.pid + ': '
  const data = util.format.apply(util, arguments).trim()
  const message = prefix + data.split('\n').join('\n' + prefix)
  process.stderr.write(message + '\n')
}

const shebang = process.platform === 'os390' ?
  '#!/bin/env ' : '#!'

const shim = shebang + process.execPath + '\n' +
  fs.readFileSync(path.join(__dirname, 'shim.js'))

const pathRe = IS_WINDOWS ? /^PATH=/i : /^PATH=/

const colon = IS_WINDOWS ? ';' : ':'

function wrap (argv, env, workingDir) {
  const spawnSyncBinding = process.binding('spawn_sync')

  // if we're passed in the working dir, then it means that setup
  // was already done, so no need.
  const doSetup = !workingDir
  if (doSetup) {
    workingDir = setup(argv, env)
  }
  const spawn = ChildProcess.prototype.spawn
  const spawnSync = spawnSyncBinding.spawn

  function unwrap() {
    if (doSetup && !doDebug) {
      rimraf.sync(workingDir)
    }
    ChildProcess.prototype.spawn = spawn
    spawnSyncBinding.spawn = spawnSync
  }

  spawnSyncBinding.spawn = wrappedSpawnFunction(spawnSync, workingDir)
  ChildProcess.prototype.spawn = wrappedSpawnFunction(spawn, workingDir)

  return unwrap
}

function wrappedSpawnFunction (fn, workingDir) {
  return wrappedSpawn

  function wrappedSpawn (options) {
    munge(workingDir, options)
    debug('WRAPPED', options)
    return fn.call(this, options)
  }
}

function isSh (file) {
  return file === 'dash' ||
         file === 'sh' ||
         file === 'bash' ||
         file === 'zsh'
}

function mungeSh (workingDir, options) {
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
  } else if (exe === 'npm' && !IS_WINDOWS) {
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

function isCmd (file) {
  const comspec = path.basename(process.env.comspec || '').replace(/\.exe$/i, '')
  return IS_WINDOWS && (file === comspec || /^cmd(?:\.exe)?$/i.test(file))
}

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

function isNode (file) {
  const cmdname = path.basename(process.execPath).replace(/\.exe$/i, '')
  return file === 'node' || cmdname === file
}

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

function mungeShebang (workingDir, options) {
  let resolved
  try {
    resolved = which.sync(options.file)
  } catch (err) {
    // nothing to do if we can't resolve
    // Most likely: file doesn't exist or is not executable.
    // Let exec pass through, probably will fail, oh well.
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

function mungeEnv (workingDir, options) {
  let pathEnv
  for (let i = 0; i < options.envPairs.length; i++) {
    const ep = options.envPairs[i]
    if (pathRe.test(ep)) {
      pathEnv = ep.substr(5)
      const k = ep.substr(0, 5)
      options.envPairs[i] = k + workingDir + colon + pathEnv
    }
  }
  if (pathEnv === undefined) {
    options.envPairs.push((IS_WINDOWS ? 'Path=' : 'PATH=') + workingDir)
  }
  if (options.originalNode) {
    const key = path.basename(workingDir).substr('.node-spawn-wrap-'.length)
    options.envPairs.push('SW_ORIG_' + key + '=' + options.originalNode)
  }

  options.envPairs.push('SPAWN_WRAP_SHIM_ROOT=' + homedir)

  if (process.env.SPAWN_WRAP_DEBUG === '1') {
    options.envPairs.push('SPAWN_WRAP_DEBUG=1')
  }
}

function isnpm (file) {
  // XXX is this even possible/necessary?
  // wouldn't npm just be detected as a node shebang?
  return file === 'npm' && !IS_WINDOWS
}

function mungenpm (workingDir, options) {
  debug('munge npm')
  // XXX weird effects of replacing a specific npm with a global one
  const npmPath = whichOrUndefined('npm')

  if (npmPath !== undefined) {
    options.args[0] = npmPath

    options.file = workingDir + '/node'
    options.args.unshift(workingDir + '/node')
  }
}

function munge (workingDir, options) {
  options.basename = path.basename(options.file).replace(/\.exe$/i, '')

  // XXX: dry this
  if (isSh(options.basename)) {
    mungeSh(workingDir, options)
  } else if (isCmd(options.basename)) {
    mungeCmd(workingDir, options)
  } else if (isNode(options.basename)) {
    mungeNode(workingDir, options)
  } else if (isnpm(options.basename)) {
    // XXX unnecessary?  on non-windows, npm is just another shebang
    mungenpm(workingDir, options)
  } else {
    mungeShebang(workingDir, options)
  }

  // now the options are munged into shape.
  // whether we changed something or not, we still update the PATH
  // so that if a script somewhere calls `node foo`, it gets our
  // wrapper instead.

  mungeEnv(workingDir, options)
}

function whichOrUndefined (executable) {
  let path
  try {
    path = which.sync(executable)
  } catch (er) {
  }
  return path
}

function setup (argv, env) {
  if (argv && typeof argv === 'object' && !env && !Array.isArray(argv)) {
    env = argv
    argv = []
  }

  if (!argv && !env) {
    throw new Error('at least one of "argv" and "env" required')
  }

  if (argv) {
    assert(Array.isArray(argv), 'argv must be an array')
  } else {
    argv = []
  }

  if (env) {
    assert(typeof env === 'object', 'env must be an object')
  } else {
    env = {}
  }

  debug('setup argv=%j env=%j', argv, env)

  // For stuff like --use_strict or --harmony, we need to inject
  // the argument *before* the wrap-main.
  const execArgv = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].match(/^-/)) {
      execArgv.push(argv[i])
      if (argv[i] === '-r' || argv[i] === '--require') {
        execArgv.push(argv[++i])
      }
    } else {
      break
    }
  }
  if (execArgv.length) {
    if (execArgv.length === argv.length) {
      argv.length = 0
    } else {
      argv = argv.slice(execArgv.length)
    }
  }

  let key = process.pid + '-' + crypto.randomBytes(6).toString('hex')
  let workingDir = homedir + key

  const settings = JSON.stringify({
    module: __filename,
    deps: {
      foregroundChild: require.resolve('foreground-child'),
      signalExit: require.resolve('signal-exit'),
    },
    isWindows: IS_WINDOWS,
    key: key,
    workingDir: workingDir,
    argv: argv,
    execArgv: execArgv,
    env: env,
    root: process.pid
  }, null, 2) + '\n'

  signalExit(function () {
    if (!doDebug) {
      rimraf.sync(workingDir)
    }
  })

  mkdirp.sync(workingDir)
  workingDir = fs.realpathSync(workingDir)
  if (IS_WINDOWS) {
    const cmdShim =
      '@echo off\r\n' +
      'SETLOCAL\r\n' +
      'SET PATHEXT=%PATHEXT:;.JS;=;%\r\n' +
      '"' + process.execPath + '"' + ' "%~dp0\\.\\node" %*\r\n'

    fs.writeFileSync(path.join(workingDir, 'node.cmd'), cmdShim)
    fs.chmodSync(path.join(workingDir, 'node.cmd'), '0755')
  }
  fs.writeFileSync(path.join(workingDir, 'node'), shim)
  fs.chmodSync(path.join(workingDir, 'node'), '0755')
  const cmdname = path.basename(process.execPath).replace(/\.exe$/i, '')
  if (cmdname !== 'node') {
    fs.writeFileSync(path.join(workingDir, cmdname), shim)
    fs.chmodSync(path.join(workingDir, cmdname), '0755')
  }
  fs.writeFileSync(path.join(workingDir, 'settings.json'), settings)

  return workingDir
}

function runMain () {
  process.argv.splice(1, 1)
  process.argv[1] = path.resolve(process.argv[1])
  delete require.cache[process.argv[1]]
  Module.runMain()
}
