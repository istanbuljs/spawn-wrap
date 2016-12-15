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

t.test('wrap a -e invocation', function (t) {
  nodes.forEach(function (node) {
    t.test(node, function (t) {
      var script = [
        "process.on('SIGTERM', function() { console.log('ignore!') })",
        "setInterval(function() {",
        "  console.log('wtf')",
        "}, 40)"
      ].join('\n')
      var child = spawn(node, ['-e', script])
      var out = ''
      child.stdout.on('data', function (c) { out += c })
      child.stderr.on('data', function (c) { process.stderr.write(c) })
      child.on('close', function (code, signal) {
        clearTimeout(timer)
        var actual = {
          out: out,
          code: code,
          signal: signal
        }
        var expect = {
          out: /^(wtf\n)*ignore!\n(wtf\n)*$/,
          code: null,
          signal: 'SIGKILL'
        }
        t.match(actual, expect)
        t.end()
      })
      var timer= setTimeout(function () {
        child.kill('SIGTERM')
        timer = setTimeout(function () {
          child.kill('SIGKILL')
        }, 150)
      }, 150)
    })
  })
  t.end()
})
