const t = require('tap')
const sw = require('../')

const WRAPPER = require.resolve('./fixtures/named.wrapper.js')
const echoArgs = require.resolve('./fixtures/echo-args.js')

function test () {
  t.test('withSpawnWrapSync', function (t) {
    t.plan(4)

    const result = sw.withSpawnWrapSync({ wrapper: WRAPPER, data: { name: 'foo' }, mode: 'same-process' }, (fooApi) => {
      return sw.withSpawnWrapSync({ wrapper: WRAPPER, data: { name: 'bar' }, mode: 'same-process' }, (barApi) => {
        {
          const { stdout, stderr } = fooApi.spawnSync(process.execPath, [echoArgs, '1'])
          const out = stdout.toString('UTF-8')
          const err = stderr.toString('UTF-8')
          if (err !== '') {
            console.error(err)
          }
          t.equal(out, 'Wrapper foo (before)\n["1"]\nWrapper foo (after)\n')
        }
        {
          const { stdout, stderr } = barApi.spawnSync(process.execPath, [echoArgs, '2'])
          const out = stdout.toString('UTF-8')
          const err = stderr.toString('UTF-8')
          if (err !== '') {
            console.error(err)
          }
          t.equal(out, 'Wrapper bar (before)\n["2"]\nWrapper bar (after)\n')
        }
        {
          const { stdout, stderr } = fooApi.spawnSync(process.execPath, [echoArgs, '3'])
          const out = stdout.toString('UTF-8')
          const err = stderr.toString('UTF-8')
          if (err !== '') {
            console.error(err)
          }
          t.equal(out, 'Wrapper foo (before)\n["3"]\nWrapper foo (after)\n')
        }
        return Math.PI
      })
    })

    t.equal(result, Math.PI)
  })
}

test()
