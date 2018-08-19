module.exports = function (wrapper) {
  const name = wrapper.context.data.name
  console.log(`Wrapper ${name} (before)`)
  wrapper.runMain()
  console.log(`Wrapper ${name} (after)`)
}
