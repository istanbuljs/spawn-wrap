var sw = require('../')
var argv = process.argv.slice(1).map(function (arg) {
  if (arg === __filename)
    arg = 'double-wrap.js'
  return arg
})

var node = process.execPath
var fg = require('foreground-child')

/*
main adds sw([first]), spawns 'parent'
first outputs some junk, calls runMain
parent adds sw([second]), spawns 'child'
second outputs some junk, calls runMain
child outputs some junk
*/

switch (process.argv[2]) {
  case 'main':
    console.error('main', process.pid, process.execArgv.concat(argv))
    console.log('main')
    sw([__filename, 'first'])
    fg(node, [__filename, 'parent'])
    break
  case 'first':
    console.error('first', process.pid, process.execArgv.concat(argv))
    console.log('first')
    sw.runMain()
    break
  case 'parent':
    console.error('parent', process.pid, process.execArgv.concat(argv))
    console.log('parent')
    sw([__filename, 'second'])
    fg(node, [__filename, 'child'])
    break
  case 'second':
    console.error('second', process.pid, process.execArgv.concat(argv))
    console.log('second')
    sw.runMain()
    break
  case 'child':
    console.error('child', process.pid, process.execArgv.concat(argv))
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
    t.equal(out, 'main\nfirst\nparent\nfirst\nsecond\nchild\n')
    t.end()
  })
}
