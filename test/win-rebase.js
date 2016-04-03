var t = require('tap')
var winRebase = require('../lib/win-rebase')

t.test('it replaces path to node bin', function (t) {
  var result = winRebase('C:\\Program Files\\nodejs\\node.exe', 'C:\\foo')
  t.equal(result, 'C:\\foo')
  t.end()
})

t.test('it does not replace path if it references an unknown bin', function (t) {
  var result = winRebase('C:\\Program Files\\nodejs\\banana', 'C:\\foo')
  t.equal(result, 'C:\\Program Files\\nodejs\\banana')
  t.end()
})

t.test('replaces node bin and leaves the script being executed', function (t) {
  var result = winRebase('C:\\Program Files\\nodejs\\node.exe foo.js', 'C:\\foo')
  t.equal(result, 'C:\\foo foo.js')
  t.end()
})

t.test('handles a quote', function (t) {
  var result = winRebase('"C:\\Program Files\\nodejs\\node.exe" "foo.js"', 'C:\\foo')
  t.equal(result, '"C:\\foo" "foo.js"')
  t.end()
})

t.test('handles many quotes', function (t) {
  var result = winRebase('""C:\\Program Files\\nodejs\\node.exe" "foo.js""', 'C:\\foo')
  t.equal(result, '""C:\\foo" "foo.js""')
  t.end()
})
