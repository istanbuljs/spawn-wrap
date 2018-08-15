import which from "which";

export function whichOrUndefined (cmd: string): string | undefined {
  let path
  try {
    path = which.sync(cmd)
  } catch (er) {
  }
  return path
}
