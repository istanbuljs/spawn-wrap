module.exports = wrap
var cp = require('child_process')
var fs = require('fs')
var ChildProcess
var assert = require('assert')
var crypto = require('crypto')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')
var path = require('path')

var shim = fs.readFileSync(__dirname + '/shim.sh')

var pathRe = /^PATH=/
if (process.platform === 'win32' ||
  process.env.OSTYPE === 'cygwin' ||
  process.env.OSTYPE === 'msys') {
  pathRe = /^PATH=/i
}

var wrapMain = require.resolve('./wrap-main.js')

function wrap (args, envs) {
  if (!ChildProcess) {
    // sure would be nice if the class were exposed...
    var child = cp.spawn('echo', [])
    ChildProcess = child.constructor
    child.kill('SIGKILL')
  }

  var workingDir = setup(args, envs)
  var spawn = ChildProcess.prototype.spawn

  function unwrap () {
    rimraf.sync(workingDir)
    ChildProcess.prototype.spawn = spawn
  }

  ChildProcess.prototype.spawn = function (options) {
    var pathEnv

    var file = path.basename(options.file)
    if (file === 'sh' || file === 'bash') {
      var cmdi = options.args.indexOf('-c')
      if (cmdi !== -1) {
        var c = options.args[cmdi + 1]
        var re = /^\s*((?:[^\=]*\=[^\=\s]*\s*)*)([^\s]+)/
        var match = c.match(re)
        if (match) {
          var exe = path.basename(match[2])
          if (exe === 'iojs' || exe === 'node') {
            c = c.replace(re, '$1' + exe)
            options.args[cmdi + 1] = c
          }
        }
      }
    }

    for (var i = 0; i < options.envPairs.length; i++) {
      var ep = options.envPairs[i]
      if (ep.match(pathRe)) {
        pathEnv = ep.substr(5)
      }
    }
    var p = workingDir
    if (pathEnv) {
      p += ':' + pathEnv
    }
    options.envPairs.push('PATH=' + p)

    return spawn.call(this, options)
  }

  return unwrap
}

function setup (args, envs) {
  if (args && typeof args === 'object' && !envs && !Array.isArray(args)) {
    envs = args
    args = []
  }

  if (!args && !envs) {
    throw new Error('at least one of "args" and "envs" required')
  }

  if (args) {
    assert(Array.isArray(args), 'args must be array')
  } else {
    args = []
  }

  var pairs = []
  if (envs) {
    assert.equal(typeof envs, 'object', 'envs must be object')
    pairs = Object.keys(envs).map(function (k) {
      return k + '=' + envs[k]
    })
  }

  // For stuff like --use_strict or --harmony, we need to inject
  // the argument *before* the wrap-main.
  var execArgs = []
  for (var i = 0; i < args.length; i++) {
    if (args[i].match(/^-/)) {
      execArgs.push(args[i])
    } else {
      break
    }
  }
  if (execArgs.length) {
    if (execArgs.length === args.length) {
      args.length = 0
    } else {
      args = args.slice(execArgs.length)
    }
  }

  var injectArgs = execArgs.concat(wrapMain)
  injectArgs.push('--args=' + args.length)
  injectArgs.push.apply(injectArgs, args)

  injectArgs.push('--envs=' + pairs.length)
  pairs.forEach(function (k) {
    injectArgs.push(k)
  })

  injectArgs.push('--')

  var workingDir = '/tmp/node-spawn-wrap-' + process.pid + '-' +
    crypto.randomBytes(6).toString('hex')

  process.on('exit', function () {
    rimraf.sync(workingDir)
  })

  mkdirp.sync(workingDir)
  workingDir = fs.realpathSync(workingDir)
  fs.writeFileSync(workingDir + '/node', shim)
  fs.chmodSync(workingDir + '/node', '0755')
  fs.writeFileSync(workingDir + '/iojs', shim)
  fs.chmodSync(workingDir + '/iojs', '0755')
  fs.writeFileSync(workingDir + '/_env', pairs.join('\n') + '\n')
  fs.writeFileSync(workingDir + '/_args', injectArgs.join('\n') + '\n')

  return workingDir
}
