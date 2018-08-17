import isWindows from "is-windows";
import path from "path";
import { SwContext } from "../context";
import { debug } from "../debug";
import { getExeBasename, isNode } from "../exe-type";
import { NormalizedOptions } from "../types";
import { whichOrUndefined } from "../which-or-undefined";

const CMD_RE = /^\s*((?:[^= ]*=[^=\s]*)*[\s]*)([^\s]+|"[^"]+"|'[^']+')( .*)?$/;

export function mungeSh(ctx: SwContext, options: NormalizedOptions): NormalizedOptions {
  const cmdFlagIndex: number = options.args.indexOf("-c");
  if (cmdFlagIndex < 0) {
    // No `-c` argument
    return options;
  }
  const cmdIndex = cmdFlagIndex + 1;
  const c: string | undefined = options.args[cmdIndex];
  if (c === undefined) {
    return options;
  }

  const match = CMD_RE.exec(c);
  if (match === null) {
    // not a command invocation.  weird but possible
    return options;
  }

  const prefix: string = match[1];
  const rawCommand: string = match[2];
  const tail: string = match[3];

  let command = rawCommand;
  // strip quotes off the command
  const quote = rawCommand.charAt(0);
  if ((quote === "\"" || quote === "'") && quote === command.slice(-1)) {
    command = command.slice(1, -1);
  }
  const exe = getExeBasename(command);

  const newArgs: string[] = [...options.args];

  const nodeShim: string = path.join(ctx.shimDir, "node");
  if (isNode(exe)) {
    // options.originalNode = command;
    newArgs[cmdIndex] = `${prefix}${rawCommand} "${nodeShim}" ${tail}`;
  } else if (exe === "npm" && !isWindows()) {
    // XXX this will exhibit weird behavior when using /path/to/npm,
    // if some other npm is first in the path.
    const npmPath = whichOrUndefined("npm");

    if (npmPath) {
      newArgs[cmdIndex] = c.replace(CMD_RE, `$1 "${nodeShim}" "${npmPath}" $3`);
      debug("npm munge!", newArgs[cmdIndex]);
    }
  }

  return {...options, args: newArgs};
}
