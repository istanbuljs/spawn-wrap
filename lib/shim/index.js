const fs = require('fs')
const path = require('path')

const SHIM_TEMPLATE_PATH = path.join(__dirname, 'shim-template.js')
const SHIM_TEMPLATE = fs.readFileSync(SHIM_TEMPLATE_PATH, 'utf8')

function getShebang (execPath) {
  const prefix = process.platform === 'os390' ? '#!/bin/env ' : '#!'
  return `${prefix}${execPath}\n`
}

function getShim (wrapContext) {
  const shebangLine = getShebang(wrapContext.root.execPath)
  const settingsJson = JSON.stringify(wrapContext, null, 2)
  const settingsLines = `const settings = ${settingsJson};\n`
  return SHIM_TEMPLATE
    .replace('/* shim-template-include: shebang */\n', shebangLine)
    .replace('/* shim-template-include: settings */\n', settingsLines)
}

function getCmdShim (wrapContext) {
  const execPath = wrapContext.root.execPath

  // TODO: Is `execPath` properly escaped?
  const cmdShim =
    '@echo off\r\n' +
    'SETLOCAL\r\n' +
    'SET PATHEXT=%PATHEXT:;.JS;=;%\r\n' +
    '"' + execPath + '"' + ' "%~dp0\\.\\node" %*\r\n'

  return cmdShim
}

module.exports = {
  getShim,
  getCmdShim
}
