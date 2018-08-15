import fs from 'fs'
import path from 'path'
import {isNode} from '../exe-type'
import {whichOrUndefined} from '../which-or-undefined'

export function mungeShebang (workingDir: string, options: any) {
  const resolved = whichOrUndefined(options.file)
  if (resolved === undefined) {
    return
  }

  const shebang = fs.readFileSync(resolved, 'utf8')
  const match = shebang.match(/^#!([^\r\n]+)/)
  if (!match) {
    return // not a shebang script, probably a binary
  }

  const shebangbin = match[1].split(' ')[0]
  const maybeNode = path.basename(shebangbin)
  if (!isNode(maybeNode)) {
    return // not a node shebang, leave untouched
  }

  options.originalNode = shebangbin
  options.basename = maybeNode
  options.file = shebangbin
  options.args = [shebangbin, workingDir + '/' + maybeNode]
    .concat(resolved)
    .concat(match[1].split(' ').slice(1))
    .concat(options.args.slice(1))
}
