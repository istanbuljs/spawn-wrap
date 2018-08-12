const fs = require('fs')
const path = require('path')

const SHIM_TEMPLATE_PATH = path.join(__dirname, 'shim-template.js')
const SHIM_TEMPLATE = fs.readFileSync(SHIM_TEMPLATE_PATH, 'utf8')

function getShebang (execPath) {
  const prefix = process.platform === 'os390' ? '#!/bin/env ' : '#!'
  return `${prefix}${execPath}\n`
}

function getShim (settings) {
  const shebangLine = getShebang(process.execPath)
  const settingsJson = JSON.stringify(settings, null, 2)
  const settingsLines = `const settings = ${settingsJson};\n`
  return SHIM_TEMPLATE
    .replace('/* shim-template-include: shebang */\n', shebangLine)
    .replace('/* shim-template-include: settings */\n', settingsLines)
}

module.exports = {
  getShim
}
