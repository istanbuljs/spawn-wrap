const fg = require('foreground-child')
const sw = require('../')

const node = process.execPath
const WRAPPER = require.resolve('./fixtures/wrap-twice.wrapper.js')

// apply 2 spawn-wraps, make sure they don't clobber one another
switch (process.argv[2]) {
  case 'main':
    console.log('main')
    sw.patchInternals({ wrapper: WRAPPER, data: 'outer' })
    sw.patchInternals({ wrapper: WRAPPER, data: 'inner' })
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
    t.equal(out, 'main\nouter\ninner\nparent\nouter\ninner\nchild\n')
    t.end()
  })
}
