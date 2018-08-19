const cp = require('child_process')
const fs = require('fs')
const isWindows = require('is-windows')
const path = require('path')
const t = require('tap')
const sw = require('../')

const winNoShebang = isWindows() && 'no shebang execution on windows'
const winNoSig = isWindows() && 'no signals get through cmd'
const fixture = require.resolve('./fixtures/script.js')
const npmFixture = require.resolve('./fixtures/npm')

const WRAPPER = require.resolve('./fixtures/basic.wrapper.js')

var unwrap = sw.wrapGlobal({wrapper: WRAPPER})

var expect = 'WRAP ["{{FIXTURE}}","xyz"]\n' +
  '[]\n' +
  '["xyz"]\n' +
  'EXIT [0,null]\n'

t.test('spawn execPath', function (t) {
  t.plan(4)

  t.test('basic', function (t) {
    const child = cp.spawn(process.execPath, [fixture, 'xyz'])

    const outChunks = []
    const errChunks = []
    child.stdout.on('data', (c) => outChunks.push(c))
    child.stderr.on('data', (c) => errChunks.push(c))
    child.on('close', function (code, signal) {
      const out = Buffer.concat(outChunks).toString('UTF-8')
      const err = Buffer.concat(errChunks).toString('UTF-8')
      t.equal(code, 0)
      t.equal(signal, null)
      t.equal(out, expect)
      t.equal(err, '')
      t.end()
    })
  })

  t.test('basic sync', function (t) {
    var child = cp.spawnSync(process.execPath, [fixture, 'xyz'])

    t.equal(child.status, 0)
    t.equal(child.signal, null)
    t.equal(child.stdout.toString(), expect)
    t.end()
  })

  t.test('SIGINT', {skip: winNoSig}, function (t) {
    var child = cp.spawn(process.execPath, [fixture, 'xyz'])

    var out = ''
    child.stdout.on('data', function (c) {
      out += c
    })
    child.stdout.once('data', function () {
      child.kill('SIGINT')
    })
    child.stderr.pipe(process.stderr)
    child.on('close', function (code, signal) {
      t.equal(code, 0)
      t.equal(signal, null)
      t.equal(out, 'WRAP ["{{FIXTURE}}","xyz"]\n' +
        '[]\n' +
        '["xyz"]\n' +
        'SIGINT\n' +
        'EXIT [0,null]\n')
      t.end()
    })
  })

  t.test('SIGHUP', {skip: winNoSig}, function (t) {
    var child = cp.spawn(process.execPath, [fixture, 'xyz'])

    var out = ''
    child.stdout.on('data', function (c) {
      out += c
      child.kill('SIGHUP')
    })
    child.on('close', function (code, signal) {
      t.equal(signal, 'SIGHUP')
      t.equal(out, 'WRAP ["{{FIXTURE}}","xyz"]\n' +
        '[]\n' +
        '["xyz"]\n' +
        'SIGHUP\n' +
        'EXIT [null,"SIGHUP"]\n')
      t.end()
    })
  })
})

t.test('spawn node', function (t) {
  t.plan(4)

  t.test('basic', function (t) {
    var child = cp.spawn('node', [fixture, 'xyz'])

    var out = ''
    child.stdout.on('data', function (c) {
      out += c
    })
    child.on('close', function (code, signal) {
      t.equal(code, 0)
      t.equal(signal, null)
      t.equal(out, expect)
      t.end()
    })
  })

  t.test('basic sync', function (t) {
    var child = cp.spawnSync('node', [fixture, 'xyz'])

    t.equal(child.status, 0)
    t.equal(child.signal, null)
    t.equal(child.stdout.toString(), expect)
    t.end()
  })

  t.test('SIGINT', {skip: winNoSig}, function (t) {
    var child = cp.spawn('node', [fixture, 'xyz'])

    var out = ''
    child.stdout.on('data', function (c) {
      out += c
    })
    child.stdout.once('data', function () {
      child.kill('SIGINT')
    })
    child.stderr.pipe(process.stderr)
    child.on('close', function (code, signal) {
      t.equal(code, 0)
      t.equal(signal, null)
      t.equal(out, 'WRAP ["{{FIXTURE}}","xyz"]\n' +
        '[]\n' +
        '["xyz"]\n' +
        'SIGINT\n' +
        'EXIT [0,null]\n')
      t.end()
    })
  })

  t.test('SIGHUP', {skip: winNoSig}, function (t) {
    var child = cp.spawn('node', [fixture, 'xyz'])

    var out = ''
    child.stdout.on('data', function (c) {
      out += c
      child.kill('SIGHUP')
    })
    child.on('close', function (code, signal) {
      t.equal(signal, 'SIGHUP')
      t.equal(out, 'WRAP ["{{FIXTURE}}","xyz"]\n' +
        '[]\n' +
        '["xyz"]\n' +
        'SIGHUP\n' +
        'EXIT [null,"SIGHUP"]\n')
      t.end()
    })
  })
})

t.test('exec execPath', function (t) {
  t.plan(4)

  t.test('basic', function (t) {
    var opt = isWindows() ? null : {shell: '/bin/bash'}
    var child = cp.exec('"' + process.execPath + '" "' + fixture + '" xyz', opt)

    var out = ''
    child.stdout.on('data', function (c) {
      out += c
    })
    child.on('close', function (code, signal) {
      t.equal(code, 0)
      t.equal(signal, null)
      t.equal(out, expect)
      t.end()
    })
  })

  t.test('execPath wrapped with quotes', function (t) {
    var opt = isWindows() ? null : {shell: '/bin/bash'}
    var child = cp.exec(JSON.stringify(process.execPath) + ' ' + fixture +
      ' xyz', opt)

    var out = ''
    child.stdout.on('data', function (c) {
      out += c
    })
    child.on('close', function (code, signal) {
      t.equal(code, 0)
      t.equal(signal, null)
      t.equal(out, expect)
      t.end()
    })
  })

  t.test('SIGINT', {skip: winNoSig}, function (t) {
    var child = cp.exec(process.execPath + ' ' + fixture + ' xyz', {shell: '/bin/bash'})

    var out = ''
    child.stdout.on('data', function (c) {
      out += c
    })
    child.stdout.once('data', function () {
      child.kill('SIGINT')
    })
    child.stderr.pipe(process.stderr)
    child.on('close', function (code, signal) {
      t.equal(code, 0)
      t.equal(signal, null)
      t.equal(out, 'WRAP ["{{FIXTURE}}","xyz"]\n' +
        '[]\n' +
        '["xyz"]\n' +
        'SIGINT\n' +
        'EXIT [0,null]\n')
      t.end()
    })
  })

  t.test('SIGHUP', {skip: winNoSig}, function (t) {
    var child = cp.exec(process.execPath + ' ' + fixture + ' xyz', {shell: '/bin/bash'})

    var out = ''
    child.stdout.on('data', function (c) {
      out += c
      child.kill('SIGHUP')
    })
    child.on('close', function (code, signal) {
      t.equal(signal, 'SIGHUP')
      t.equal(out, 'WRAP ["{{FIXTURE}}","xyz"]\n' +
        '[]\n' +
        '["xyz"]\n' +
        'SIGHUP\n' +
        'EXIT [null,"SIGHUP"]\n')
      t.end()
    })
  })
})

t.test('exec shebang', {skip: winNoShebang}, function (t) {
  t.plan(3)

  t.test('basic', function (t) {
    var child = cp.exec(fixture + ' xyz', {shell: '/bin/bash'})

    var out = ''
    child.stdout.on('data', function (c) {
      out += c
    })
    child.on('close', function (code, signal) {
      t.equal(code, 0)
      t.equal(signal, null)
      t.equal(out, expect)
      t.end()
    })
  })

  t.test('SIGHUP', function (t) {
    var child = cp.exec(fixture + ' xyz', {shell: '/bin/bash'})

    var out = ''
    child.stdout.on('data', function (c) {
      out += c
      child.kill('SIGHUP')
    })
    child.on('close', function (code, signal) {
      t.equal(signal, 'SIGHUP')
      t.equal(out, 'WRAP ["{{FIXTURE}}","xyz"]\n' +
        '[]\n' +
        '["xyz"]\n' +
        'SIGHUP\n' +
        'EXIT [null,"SIGHUP"]\n')
      t.end()
    })
  })

  t.test('SIGINT', function (t) {
    var child = cp.exec(fixture + ' xyz', {shell: '/bin/bash'})

    var out = ''
    child.stdout.on('data', function (c) {
      out += c
    })
    child.stdout.once('data', function () {
      child.kill('SIGINT')
    })
    child.stderr.pipe(process.stderr)
    child.on('close', function (code, signal) {
      t.equal(code, 0)
      t.equal(signal, null)
      t.equal(out, 'WRAP ["{{FIXTURE}}","xyz"]\n' +
        '[]\n' +
        '["xyz"]\n' +
        'SIGINT\n' +
        'EXIT [0,null]\n')
      t.end()
    })
  })
})

// see: https://github.com/bcoe/nyc/issues/190
t.test('Node 5.8.x + npm 3.7.x - spawn', {skip: winNoShebang}, function (t) {
  var npmdir = path.dirname(npmFixture)
  process.env.PATH = npmdir + ':' + (process.env.PATH || '')
  var child = cp.spawn('npm', ['xyz'])

  var out = ''
  child.stdout.on('data', function (c) {
    out += c
  })
  child.on('close', function (code, signal) {
    t.equal(code, 0)
    t.equal(signal, null)
    t.true(~out.indexOf('xyz'))
    t.end()
  })
})

t.test('Node 5.8.x + npm 3.7.x - shell', {skip: winNoShebang}, function (t) {
  var npmdir = path.dirname(npmFixture)
  process.env.PATH = npmdir + ':' + (process.env.PATH || '')
  var child = cp.exec('npm xyz')

  var out = ''
  child.stdout.on('data', function (c) {
    out += c
  })
  var err = ''
  child.stderr.on('data', function (c) {
    err += c
  })
  child.on('close', function (code, signal) {
    t.equal(code, 0)
    t.equal(signal, null)
    t.true(~out.indexOf('xyz'))
    t.equal(err, '')
    t.end()
  })
})

t.test('--harmony', function (t) {
  var node = process.execPath
  var child = cp.spawn(node, ['--harmony', fixture, 'xyz'])
  var out = ''
  child.stdout.on('data', function (c) {
    out += c
  })
  child.on('close', function (code, signal) {
    t.equal(code, 0)
    t.equal(signal, null)
    t.equal(out, 'WRAP ["--harmony","{{FIXTURE}}","xyz"]\n' +
      '["--harmony"]\n' +
      '["xyz"]\n' +
      'EXIT [0,null]\n')
    t.end()
  })
})

t.test('node exe with different name', function (t) {
  var fp = path.join(__dirname, 'fixtures', 'exething.exe')
  var data = fs.readFileSync(process.execPath)
  fs.writeFileSync(fp, data)
  fs.chmodSync(fp, '0775')
  var child = cp.spawn(process.execPath, [fixture, 'xyz'])

  var out = ''
  child.stdout.on('data', function (c) {
    out += c
  })
  child.on('close', function (code, signal) {
    t.equal(code, 0)
    t.equal(signal, null)
    t.equal(out, expect)
    fs.unlinkSync(fp)
    t.end()
  })
})

t.test('unwrap', function (t) {
  unwrap()
  t.end()
})
