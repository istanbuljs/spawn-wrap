export interface ParsedNodeOptions {
  /**
   * Path to the executable.
   */
  execPath: string;

  /**
   * Node execution arguments (`process.execArgv`)
   *
   * The double dash (`--`) indicating the end of execArgs is treated
   * differently from the Node builtin parser:
   * - The Node parser adds the double dash as the last item of
   *   `process.execArgv`.
   * - This module does not add the `--`.
   *
   * This behavior allows to safely generate the command as
   * `[execPath, ...execArgs, "--", appArgs]`
   */
  execArgs: ReadonlyArray<string>;

  /**
   * Application arguments (`process.argv.slice(1)`)
   */
  appArgs: ReadonlyArray<string>;

  hasInteractive: boolean;

  hasEval: boolean;
}

/**
 * Parses a Node command line invocation.
 *
 * The cliArgs is the array of components as defined by the man page:
 *
 * ```
 * SYNOPSIS
 * node [options] [v8-options] [-e string | script.js | -] [--] [arguments ...]
 * node inspect [-e string | script.js | - | <host>:<port>] ...
 * node [--v8-options]
 * ```
 *
 * @param cliArgs
 * @see https://github.com/nodejs/node/blob/29a71bae40ffa0bbc8ba6b2bdf051a09987da7f7/src/node_options.cc
 */
export function parseNodeOptions(cliArgs: ReadonlyArray<string>): ParsedNodeOptions {
  if (cliArgs.length < 1) {
    throw new Error("Expected `cliArgs` to have at least 1 item.");
  }
  const execPath: string = cliArgs[0];
  let hasEval: boolean = false;
  let hasInteractive: boolean = false;

  let i = 1;
  let hasDoubleDash: boolean = false;
  for (; i < cliArgs.length; i++) {
    // TODO: Check how to handle "-" (read from stdin)
    const arg = cliArgs[i];
    if (!arg.match(/^-/)) {
      break;
    } else if (arg === "--") {
      hasDoubleDash = true;
      break;
    }
    if (needsParameter(arg)) {
      i = Math.min(i + 1, cliArgs.length);
    }
    if (!hasEval) {
      hasEval = /(?:^-[a-z]*e[a-z]*$)|(?:^--eval(?:$|=))/.test(arg);
    }
    if (!hasInteractive) {
      hasInteractive = /(?:^-[a-z]*i[a-z]*$)|(?:^--interactive$)/.test(arg);
    }
  }
  const execArgs: ReadonlyArray<string> = cliArgs.slice(1, i);
  const appArgsStart: number = hasDoubleDash ? i + 1 : i;
  const appArgs: ReadonlyArray<string> = cliArgs.slice(appArgsStart);
  return {
    execPath,
    execArgs,
    appArgs,
    hasEval,
    hasInteractive,
  };
}

/**
 * Checks if the provided Node argument needs a parameter.
 *
 * `true` means that the following argument should be treated as a parameter.
 *
 * @param arg Argument to check.
 */
function needsParameter(arg: string): boolean {
  switch (arg) {
    case "--require":
    case "--eval":
      return true;
    default:
      if (arg.match(/^-[a-z]+/)) {
        return /[er]/.test(arg);
      }
      return false;
  }
}
