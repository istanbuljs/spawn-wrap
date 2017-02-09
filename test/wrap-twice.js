var sw = require('../')
var argv = process.argv.slice(1).map(function (arg) {
  if (arg === __filename)
    arg = 'double-wrap.js'
  return arg
})

var node = process.execPath
var fg = require('foreground-child')

// apply 2 spawn-wraps, make sure they don't clobber one another
switch (process.argv[2]) {
  case 'outer':
    console.log('outer')
    sw.runMain()
    break

  case 'inner':
    console.log('inner')
    sw.runMain()
    break

  case 'main':
    console.log('main')
    sw([__filename, 'outer'])
    sw([__filename, 'inner'])
    fg(node, [__filename, 'parent'])
    break

  case 'parent':
    console.log('parent')
    fg(node, [__filename, 'child'])
    break

  case 'child':
    console.log('child')
    break

  default:
    runTest()
    break
}

function runTest () {
  var t = require('tap')
  var spawn = require('child_process').spawn
  var child = spawn(node, [__filename, 'main'])
  // child.stderr.pipe(process.stderr)
  var out = ''
  child.stdout.on('data', function (c) {
    out += c
  })
  child.on('close', function (code, signal) {
    t.notOk(code)
    t.notOk(signal)
    t.equal(out, 'main\nouter\ninner\nparent\nouter\ninner\nchild\n')
    t.end()
  })
}
