const t = require('tap')
const cp = require('child_process')
const sw = require('../')

if (process.argv[2] === 'wrapper') {
  // note: this should never happen,
  // because -e invocations aren't wrapped
  throw new Error('this wrapper should not be executed')
}

const spawn = cp.spawn
const nodes = ['node', process.execPath]
const WRAPPER = require.resolve('./fixtures/exec-flag.wrapper.js')

sw.wrapGlobal({wrapper: WRAPPER})

t.test('try to wrap a -e invocation but it isnt wrapped', function (t) {
  nodes.forEach(function (node) {
    t.test(node, function (t) {
      const script = 'console.log(\'hello\')\n'
      const child = spawn(node, ['-e', script])
      const outChunks = []
      child.stdout.on('data', (c) => outChunks.push(c))
      child.stderr.pipe(process.stderr)
      child.on('close', function (code, signal) {
        const out = Buffer.concat(outChunks).toString('UTF-8')
        const actual = {out, code, signal}
        const expect = {
          out: 'hello\n',
          code: 0,
          signal: null
        }
        t.match(actual, expect)
        t.end()
      })
    })
  })
  t.end()
})
