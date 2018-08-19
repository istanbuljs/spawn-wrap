const tap = require('tap')
const spawnWrap = require('../')

const NESTED_SYNC = require.resolve('./fixtures/nested/nested-sync-0.js')

const outChunks = []

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
          // rootProcess.stderr.pipe(process.stderr)
        }
        // console.log(ev.args)
        ev.voidSpawn([...ev.args, 'extra'])
      },
      undefined,
      () => {
        const out = Buffer.concat(outChunks).toString('UTF-8')
        t.equal(out, EXPECTED_OUT)
        t.end()
      }
    )
})
