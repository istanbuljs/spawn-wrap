import isWindows from "is-windows";

const PATH_ENV_NAME_RE = new RegExp("^PATH$", isWindows() ? "i" : "");
const PATH_ENV_SEPARATOR = isWindows() ? ";" : ":";

export function prependPathEnv(oldPathValue: string, dir: string): string {
  // TODO: Escape path containing `PATH_ENV_SEPARATOR`?
  if (oldPathValue.length > 0) {
    return `${dir}${PATH_ENV_SEPARATOR}${oldPathValue}`;
  } else {
    return dir;
  }
}

export function removeFromPathEnv(oldPathValue: string, dir: string): string {
  return oldPathValue
    .split(PATH_ENV_SEPARATOR)
    .filter((p) => p !== dir)
    .join(PATH_ENV_SEPARATOR);
}

export function isPathEnvName(varName: string): boolean {
  return PATH_ENV_NAME_RE.test(varName);
}
