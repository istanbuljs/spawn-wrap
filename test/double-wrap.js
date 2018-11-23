const fg = require('foreground-child')
const sw = require('../')

var argv = process.argv.slice(1).map(function (arg) {
  return arg === __filename ? 'double-wrap.js' : arg
})

const node = process.execPath
const WRAPPER = require.resolve('./fixtures/double-wrap.wrapper.js')

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
    sw.patchInternals({ wrapper: WRAPPER, data: 'first' })
    fg(node, [__filename, 'parent'])
    break
  case 'parent':
    console.error('parent', process.pid, process.execArgv.concat(argv))
    console.log('parent')
    sw.patchInternals({ wrapper: WRAPPER, data: 'second' })
    fg(node, [__filename, 'child'])
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
  const t = require('tap')
  const spawn = require('child_process').spawn
  const child = spawn(node, [__filename, 'main'])
  // child.stderr.pipe(process.stderr)
  const outChunks = []
  child.stdout.on('data', (c) => outChunks.push(c))
  child.on('close', function (code, signal) {
    const out = Buffer.concat(outChunks).toString('UTF-8')
    t.equal(code, 0)
    t.equal(signal, null)
    t.equal(out, 'main\nfirst\nparent\nfirst\nsecond\nchild\n')
    t.end()
  })
}
