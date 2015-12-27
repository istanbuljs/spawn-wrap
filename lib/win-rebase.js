var re = /^\s*("?[^"]*?\b((?:node|iojs)(?:\.exe)?))($| )/

module.exports = function (path, rebase) {
  var m = path.match(re)
  if (!m) return path
  var quoted = m[1].charAt(0) === '"'
  if (quoted) rebase = '"' + rebase
  return path.replace(m[1].trim(), rebase)
}
