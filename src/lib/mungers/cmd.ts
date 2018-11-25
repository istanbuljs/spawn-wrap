import path from "path";
import { SwContext } from "../context";
import { NormalizedOptions } from "../types";
import { whichOrUndefined } from "../which-or-undefined";

const NODE_RE = /^\s*("*)([^"]*?\bnode(?:\.exe)?)("*)((?:\s.*)?)$/i;
const NPM_RE = /^\s*("*)(?:[^"]*?\b(?:npm))("*)(\s|$)/i;

// TODO: Find a lib to properly parse and print `cmd` commands.
export function mungeCmd(ctx: SwContext, options: NormalizedOptions): NormalizedOptions {
  const cmdFlagIndex: number = options.args.indexOf("/c");
  if (cmdFlagIndex < 0) {
    return options;
  }
  const cmdIndex = cmdFlagIndex + 1;
  const command: string | undefined = options.args[cmdIndex];
  if (command === undefined) {
    return options;
  }

  const nodeMatch: RegExpExecArray | null = NODE_RE.exec(command);
  if (nodeMatch !== null) {
    const startDelimiter: string = nodeMatch[1];
    const originalNode: string = nodeMatch[2];
    const endDelimiter: string = nodeMatch[3];
    const tail: string = nodeMatch[4];

    const newArgs: string[] = [...options.args];
    newArgs[cmdIndex] = `${startDelimiter}${originalNode}${endDelimiter} -- "${ctx.shimScript}" ${tail}`;
    return {...options, args: newArgs};
  }

  const npmMatch: RegExpExecArray | null = NPM_RE.exec(command);
  if (npmMatch !== null) {
    // XXX probably not a good idea to rewrite to the first npm in the
    // path if it's a full path to npm.  And if it's not a full path to
    // npm, then the dirname will not work properly!
    const npmPath: string | undefined = whichOrUndefined("npm");
    if (npmPath === undefined) {
      return options;
    }
    // Before converting to TS, `npmDir` was set `.` if `npmPath` was undefined.
    // The `mungeNpm` functions bails out in this context...
    // Last version before the change (git hash): 59db923d7ba9bf2a867739570d09e78a4dc1af28
    const npmDir = path.dirname(npmPath);
    // Does not seem that reliable, but probably good enough.
    const npmCli: string = path.join(npmDir, "node_modules", "npm", "bin", "npm-cli.js");
    const startDelimiter: string = npmMatch[1];
    const endDelimiter: string = npmMatch[2];
    const endSpace: string | undefined = npmMatch[3];
    const tail: string = options.args[cmdIndex].substr(npmMatch[0].length);

    const nodeShim = ctx.shimExecutable;

    const newArgs: string[] = [...options.args];
    newArgs[cmdIndex] = `${startDelimiter}${nodeShim}${endDelimiter} "${npmCli}"${endSpace}${tail}`;
    return {...options, args: newArgs};
  }

  return options;
}
