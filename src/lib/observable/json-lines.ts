import { empty, Observable, OperatorFunction, pipe } from "rxjs";
import { map, mergeMap } from "rxjs/operators";
import { fromArray } from "../../../node_modules/rxjs/internal/observable/fromArray";

export function parseJsonLines(): OperatorFunction<Buffer, any> {
  return pipe(parseLines(), map((line) => JSON.parse(line)));
}

export function printJsonLines(): OperatorFunction<any, Buffer> {
  return map((data) => Buffer.from(`${JSON.stringify(data)}\n`));
}

/**
 * Creates an RX operator parsing a stream of UTF-8 bytes to a stream of lines.
 *
 * The lines are delimited by `\n`. The delimiter is part of the line.
 * If the last line does not end with `\n`, it is not emitted.
 *
 * TODO: Emit last line, even if it does not end with `\n`
 */
function parseLines(): OperatorFunction<Buffer, string> {
  const NEW_LINE_BYTES: Uint8Array = Buffer.from("\n");
  const chunks: Buffer[] = [];
  return mergeMap((chunk: Buffer): Observable<string> => {
    chunks.push(chunk);
    if (chunk.indexOf(NEW_LINE_BYTES) < 0) {
      return empty();
    }
    const all: Buffer = Buffer.concat(chunks);
    const lines: string[] = [];
    let lastIndex: number = 0;
    while (true) {
      const index = all.indexOf(NEW_LINE_BYTES, lastIndex);
      if (index < 0) {
        break;
      }
      const nextIndex = index + NEW_LINE_BYTES.length;
      lines.push(all.slice(lastIndex, nextIndex).toString());
      lastIndex = nextIndex;
    }
    chunks.splice(0, chunks.length, all.slice(lastIndex));
    return fromArray(lines);
  });
}
