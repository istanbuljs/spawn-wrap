import path from "path"
import {debug} from "../debug"
import {whichOrUndefined} from "../which-or-undefined";

export function mungeNpm (workingDir: string, options: any) {
  debug('munge npm')
  // XXX weird effects of replacing a specific npm with a global one
  const npmPath = whichOrUndefined('npm')

  if (npmPath !== undefined) {
    options.args[0] = npmPath

    const file = path.join(workingDir, 'node')
    options.file = file
    options.args.unshift(file)
  }
}
