export function getMainIndex(args: ReadonlyArray<string>): number | undefined {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "-i":
      case "--interactive":
      case "--eval":
      case "-e":
      case "-p":
      case "-pe":
        return undefined;
      case "-r":
      case "--require":
        i += 1;
        continue;
      default:
        // TODO: Double-check what's going on
        if (arg.match(/^-/)) {
          continue;
        } else {
          return i;
        }
    }
  }
}
