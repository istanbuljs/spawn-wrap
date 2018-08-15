import isWindows from "is-windows";
import path from "path";

const pathRe = isWindows() ? /^PATH=/i : /^PATH=/
const colon = isWindows() ? ';' : ':'

export function mungeEnv (workingDir: string, options: any) {
  let pathEnv
  for (let i = 0; i < options.envPairs.length; i++) {
    const ep = options.envPairs[i]
    if (pathRe.test(ep)) {
      pathEnv = ep.substr(5)
      const k = ep.substr(0, 5)
      options.envPairs[i] = k + workingDir + colon + pathEnv
    }
  }
  if (pathEnv === undefined) {
    options.envPairs.push((isWindows() ? 'Path=' : 'PATH=') + workingDir)
  }
  if (options.originalNode) {
    const key = path.basename(workingDir)
    options.envPairs.push('SW_ORIG_' + key + '=' + options.originalNode)
  }

  // options.envPairs.push('SPAWN_WRAP_SHIM_ROOT=' + homedir)

  if (process.env.SPAWN_WRAP_DEBUG === '1') {
    options.envPairs.push('SPAWN_WRAP_DEBUG=1')
  }
}
