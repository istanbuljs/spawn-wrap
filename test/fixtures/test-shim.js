module.exports = function (wrapperApi) {
  console.log('before in shim')
  wrapperApi.runMain()
  console.log('after in shim')
}
