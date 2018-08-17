const t = require('tap')
const sw = require('../')

const namedWrapper = require.resolve('./fixtures/named-wrapper.js')
const echoArgs = require.resolve('./fixtures/echo-args.js')

function test () {
  t.test('withSpawnWrapSync', function (t) {
    t.plan(7)

    const result = sw.withSpawnWrapSync({args: [namedWrapper, 'foo']}, (fooApi) => {
      return sw.withSpawnWrapSync({args: [namedWrapper, 'bar']}, (barApi) => {
        {
          const {stdout, stderr} = fooApi.spawnSync(process.execPath, [echoArgs, '1'])
          const stdoutStr = stdout.toString('UTF-8')
          const stderrStr = stderr.toString('UTF-8')
          t.equal(stdoutStr, 'Wrapper foo (before)\n["1"]\nWrapper foo (after)\n')
          t.equal(stderrStr, '')
        }
        {
          const {stdout, stderr} = barApi.spawnSync(process.execPath, [echoArgs, '2'])
          const stdoutStr = stdout.toString('UTF-8')
          const stderrStr = stderr.toString('UTF-8')
          t.equal(stdoutStr, 'Wrapper bar (before)\n["2"]\nWrapper bar (after)\n')
          t.equal(stderrStr, '')
        }
        {
          const {stdout, stderr} = fooApi.spawnSync(process.execPath, [echoArgs, '3'])
          const stdoutStr = stdout.toString('UTF-8')
          const stderrStr = stderr.toString('UTF-8')
          t.equal(stdoutStr, 'Wrapper foo (before)\n["3"]\nWrapper foo (after)\n')
          t.equal(stderrStr, '')
        }
        return Math.PI
      })
    })

    t.equal(result, Math.PI)
  })
}

test()
