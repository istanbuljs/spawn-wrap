const tap = require('tap')
const spawnWrap = require('../')

const NESTED_SYNC = require.resolve('./fixtures/nested/nested-sync-0.js')

const outChunks = []
const errChunks = []

const EXPECTED_OUT = '' +
  'Nested 0 (before)\n' +
  'Nested 1 (before)\n' +
  'Nested 2 (before)\n' +
  '[ \'extra\' ]\n' +
  'Nested 2 (after)\n' +
  'Nested 1 (after)\n' +
  'Nested 0 (after)\n'

tap.test('observeSpawn', (t) => {
  spawnWrap
    .observeSpawn(process.execPath, [NESTED_SYNC])
    .subscribe(
      (ev) => {
        // console.log('Intercepted a Node process spawn!')
        const rootProcess = ev.rootProcess
        if (rootProcess !== undefined) {
          // console.log(`(Root process)`)
          rootProcess.stdout.on('data', (chunk) => outChunks.push(chunk))
          rootProcess.stderr.on('data', (chunk) => errChunks.push(chunk))
        }
        // console.log(ev.args)
        ev.voidSpawn([...ev.args, 'extra'])
      },
      undefined,
      () => {
        const outStr = Buffer.concat(outChunks).toString('UTF-8')
        const errStr = Buffer.concat(errChunks).toString('UTF-8')
        t.equal(outStr, EXPECTED_OUT)
        t.equal(errStr, '')
        t.end()
      }
    )
})
