var argv = process.argv.slice(1).map(function (arg) {
  return arg === __filename ? 'double-wrap.js' : arg
})

/*
main adds sw([first]), spawns 'parent'
first outputs some junk, calls runMain
parent adds sw([second]), spawns 'child'
second outputs some junk, calls runMain
child outputs some junk
*/

module.exports = function (wrapper) {
  switch (wrapper.context.data) {
    case 'first':
      console.error('first', process.pid, process.execArgv.concat(argv))
      console.log('first')
      wrapper.runMain()
      break
    case 'second':
      console.error('second', process.pid, process.execArgv.concat(argv))
      console.log('second')
      wrapper.runMain()
      break
  }
}
