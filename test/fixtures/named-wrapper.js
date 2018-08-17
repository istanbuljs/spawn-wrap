const spawnWrap = require('../../')

const name = process.argv[2]
console.log(`Wrapper ${name} (before)`)
spawnWrap.runMain()
console.log(`Wrapper ${name} (after)`)
