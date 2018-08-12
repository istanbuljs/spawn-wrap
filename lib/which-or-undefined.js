'use strict';

const which = require("which")

function whichOrUndefined(executable) {
  let path
  try {
    path = which.sync(executable)
  } catch (err) {
  }
  return path
}

module.exports = {
  whichOrUndefined
}
