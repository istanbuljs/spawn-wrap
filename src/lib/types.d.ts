import childProcess from "child_process";

/**
 * Options used by the internal spawn and spawnSync functions
 */
export interface InternalSpawnOptions {
  file: string;
  args: string[];
  cwd?: string;
  windowsHide: boolean;
  windowsVerbatimArguments: boolean;
  detached: boolean;
  envPairs: string[];
  stdio?: childProcess.StdioOptions;
  uid?: number;
  gid?: number;
}

/**
 * Options transformed by the mungers.
 */
export interface NormalizedOptions {
  readonly file: string;
  readonly args: ReadonlyArray<string>;
  readonly env: ReadonlyMap<string, string>;
}
