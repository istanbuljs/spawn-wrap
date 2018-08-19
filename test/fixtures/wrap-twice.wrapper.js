module.exports = function (wrapper) {
  switch (wrapper.context.data) {
    case 'outer':
      console.log('outer')
      wrapper.runMain()
      break
    case 'inner':
      console.log('inner')
      wrapper.runMain()
      break
  }
}
