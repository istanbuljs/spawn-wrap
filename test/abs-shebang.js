const { spawn } = require('child_process')
const fs = require('fs')
const mkdirp = require('mkdirp')
const path = require('path')
const rimraf = require('rimraf')
const t = require('tap')

const node = process.execPath
const wrap = require.resolve('./fixtures/wrap.js')

if (process.platform === 'win32') {
  t.plan(0, 'No proper shebang support on windows, so skip this')
  process.exit(0)
}

const expect =
  'before in shim\n' +
  'shebang main foo,bar\n' +
  'after in shim\n' +
  'before in shim\n' +
  'shebang main foo,bar\n' +
  'after in shim\n'

const fixdir = path.resolve(__dirname, 'fixtures', 'shebangs')

t.test('setup', function (t) {
  rimraf.sync(fixdir)
  mkdirp.sync(fixdir)
  t.end()
})

t.test('absolute', function (t) {
  const file = path.resolve(fixdir, 'absolute.js')
  runTest(file, process.execPath, t)
})

t.test('env', function (t) {
  const file = path.resolve(fixdir, 'env.js')
  runTest(file, '/usr/bin/env node', t)
})

function runTest (file, shebang, t) {
  const content = '#!' + shebang + '\n' +
    'console.log("shebang main " + process.argv.slice(2))\n'
  fs.writeFileSync(file, content, 'utf8')
  fs.chmodSync(file, '0755')
  const child = spawn(node, [wrap, file, 'foo', 'bar'])
  let out = ''
  let err = ''
  child.stdout.on('data', function (c) {
    out += c
  })
  child.stderr.on('data', function (c) {
    err += c
  })
  child.on('close', function (code, signal) {
    t.equal(code, 0)
    t.equal(signal, null)
    t.equal(out, expect)
    t.equal(err, '')
    t.end()
  })
}

t.test('cleanup', function (t) {
  rimraf.sync(fixdir)
  t.end()
})
