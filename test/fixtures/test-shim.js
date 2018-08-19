module.exports = function (wrapper) {
  console.log('before in shim')
  wrapper.runMain()
  console.log('after in shim')
}
