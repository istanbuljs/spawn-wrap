const { spawnSync } = require('child_process')

console.log('Nested 1 (before)')
spawnSync(process.execPath, [require.resolve('./nested-sync-2.js')], { stdio: 'inherit' })
console.log('Nested 1 (after)')
