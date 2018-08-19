import cp from "child_process";
import { SwContext } from "./context";

export interface RootProcess {
  pid: number;
  execPath: string;
}

export interface WrapperApi<D = any> {
  context: SwContext<D>;

  args: ReadonlyArray<string>;

  runMain?(): void;
}

export interface SwOptions {
  /**
   * Path to the wrapper module.
   *
   * The wrapper module will be required at the beginnig of each spawned Node
   * process.
   * If its `module.exports` is a function or its `default` named export is a
   * function, this function will be called with a `WrapperApi` object.
   *
   * The path is resolved with `path.resolve` to ensure it is absolute.
   */
  wrapper: string;

  /**
   * A JSON-stringifyable object that will be passed the the wrapper main.
   *
   * This object will be used as the value of the `data` property of
   * `WrapperApi`.
   */
  data: any;

  /**
   * Location where the shim directories will be created.
   *
   * Default:
   * - If the env var `SPAWN_WRAP_SHIM_ROOT`, use its value
   * - Otherwise, `.node-spawn-wrap` directory inside user's home dir.
   */
  shimRoot?: string;

  /**
   * Try to run the wrapper and original main in the same process.
   * If `true`, then `WrapperApi` will have a `runMain`, otherwise not.
   */
  sameProcess?: boolean;
}

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
  stdio?: cp.StdioOptions;
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
