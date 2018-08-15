import childProcess from "child_process";

// This is what the mungers transform
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
