var sw = require('../')

if (process.argv[2] === 'wrapper') {
  // note: this should never happen,
  // because -e invocations aren't wrapped
  throw new Error('this wrapper should not be executed')
}

var t = require('tap')
var cp = require('child_process')
var spawn = cp.spawn
var exec = cp.exec
var nodes = [ 'node', process.execPath ]

sw([__filename, 'wrapper'])

t.test('try to wrap a -e invocation but it isnt wrapped', function (t) {
  nodes.forEach(function (node) {
    t.test(node, function (t) {
      var script = "console.log('hello')\n"
      var child = spawn(node, ['-e', script])
      var out = ''
      child.stdout.on('data', function (c) { out += c })
      child.stderr.on('data', function (c) { process.stderr.write(c) })
      child.on('close', function (code, signal) {
        var actual = {
          out: out,
          code: code,
          signal: signal
        }
        var expect = {
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
