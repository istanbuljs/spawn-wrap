const { spawnSync } = require('child_process')

console.log('Nested 0 (before)')
spawnSync(process.execPath, [require.resolve('./nested-sync-1.js')], { stdio: 'inherit' })
console.log('Nested 0 (after)')
