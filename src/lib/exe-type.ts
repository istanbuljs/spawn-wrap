import isWindows from "is-windows";
import path from "path";

export function isCmd(file: string): boolean {
  const comspec = path.basename(process.env.comspec || "").replace(/\.exe$/i, "");
  return isWindows() && (file === comspec || /^cmd(?:\.exe)?$/i.test(file));
}

export function isNode(file: string): boolean {
  const cmdname = path.basename(process.execPath).replace(/\.exe$/i, "");
  return file === "node" || cmdname === file;
}

export function isNpm(file: string): boolean {
  // XXX is this even possible/necessary?
  // wouldn't npm just be detected as a node shebang?
  return file === "npm" && !isWindows();
}

const KNOWN_SHELLS = ["dash", "sh", "bash", "zsh"];

export function isSh(file: string): boolean {
  return KNOWN_SHELLS.indexOf(file) >= 0;
}

export function getExeBasename(exePath: string): string {
  const baseName = path.basename(exePath);
  return isWindows() ? baseName.replace(/\.exe$/i, "") : baseName;
}
