import which from "which";

export function whichOrUndefined(cmd: string): string | undefined {
  try {
    return which.sync(cmd);
  } catch (err) {
    return undefined;
  }
}
