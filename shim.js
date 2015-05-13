// This module should *only* be loaded as a main script
// by child processes wrapped by spawn-wrap.  It sets up
// argv to include the injected argv (including the user's
// wrapper script) and any environment variables specified.
//
// If any argv were passed in (ie, if it's used to force
// a wrapper script, and not just ensure that an env is kept
// around through all the child procs), then we also set up
// a require('spawn-wrap').runMain() function that will strip
// off the injected arguments and run the main file.

if (module !== require.main) {
  throw new Error('spawn-wrap: cli wrapper invoked as non-main script')
}

var Module = require('module')
var assert = require('assert')
var path = require('path')

var settings = require('./settings.json')
var argv = settings.argv
var nargs = argv.length
var env = settings.env

for (var key in env) {
  process.env[key] = env[key]
}

// If there are execArgv, and they're not the same as how this module
// was executed, then we need to inject those.  This is for stuff like
// --harmony or --use_strict that needs to be *before* the main
// module.
if (settings.execArgv) {
  var pexec = process.execArgv
  var sexec = settings.execArgv
  if (JSON.stringify(pexec) !== JSON.stringify(sexec)) {
    var spawn = require('child_process').spawn
    var node = process.execPath
    var sargs = pexec.concat(sexec).concat(process.argv.slice(1))
    var child = spawn(node, sargs, { stdio: 'inherit' })
    child.on('close', function (code, signal) {
      if (signal) {
        process.kill(process.pid, signal)
      } else {
        process.exit(code)
      }
    })
    return
  }
}

var spliceArgs = [1, 1].concat(argv)
process.argv.splice.apply(process.argv, spliceArgs)

// If the user added their OWN wrapper pre-load script, then
// this will pop that off of the argv, and load the "real" main
function runMain () {
  process.argv.splice(1, nargs)
  process.argv[1] = path.resolve(process.argv[1])
  clearModuleCache()
  Module.runMain()
}

function clearModuleCache () {
  // A recipe for memory leaks!  Never ever do this, omg!
  Object.keys(Module._cache).forEach(function (k) {
    delete Module._cache[k]
  })
}

clearModuleCache()
var spawnWrap = require(settings.module)
if (nargs) {
  spawnWrap.runMain = runMain
}
spawnWrap(argv, env, __dirname)

Module.runMain()
