#!/usr/bin/env node
if (process.env.xyz) {
  console.log('in t.js, xyz=%j', process.env.xyz)
  console.log('%j', process.argv)
  require('./index.js').runMain()
  console.error('ran wrapped main')
  return
}

var wrap = require('./index.js')

var unwrap = wrap(['--harmony', __filename, ' a $ b '], { xyz: 'ABC' })

var cp = require('child_process')
var child = cp.exec(process.execPath + ' $(which tap ) -h', { env: { foo: 'asdf' } }, function (er, out, err) {
  console.error('returned')
  console.error('error = ', er)
  console.error('outlen=', out.length)
  console.error('\u001b[31m' + out + '\u001b[m')
  console.error('errlen=', err.length)
  process.stderr.write(err)
})
