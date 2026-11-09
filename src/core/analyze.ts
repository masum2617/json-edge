import {
  createScanner,
  SyntaxKind,
  parseTree,
  printParseErrorCode,
  type Node,
  type ParseError,
} from 'jsonc-parser';
import {
  LIMITS,
  jsonType,
  type Analysis,
  type FieldDescriptor,
  type JsonObject,
} from './types';

/** Encode a property path without confusing dots, empty keys, slashes or tildes. */
export function toPointer(segments: readonly string[]): string {
  return segments
    .map((key) => '/' + key.replace(/~/g, '~0').replace(/\//g, '~1'))
    .join('');
}

function failAt(text: string, offset: number, message: string): never {
  const before = text.slice(0, offset).split(/\r\n|\r|\n/);
  throw new Error(
    `${message} (line ${before.length}, column ${(before.at(-1)?.length ?? 0) + 1}).`,
  );
}

/** Walk the syntax tree before constructing data, including inside atomic arrays. */
function validateTree(node: Node, text: string, depth: number): void {
  if (depth > LIMITS.depth)
    failAt(text, node.offset, `Nesting exceeds ${LIMITS.depth} levels`);
  if (
    node.type === 'number' &&
    (!Number.isFinite(node.value) ||
      (Number.isInteger(node.value) && !Number.isSafeInteger(node.value)))
  ) {
    failAt(
      text,
      node.offset,
      'Number cannot be represented safely; encode large identifiers as strings',
    );
  }
  if (node.type === 'object') {
    const keys = new Set<string>();
    for (const property of node.children ?? []) {
      const key = property.children?.[0];
      const value = property.children?.[1];
      if (!key || !value) continue; // Syntax errors are reported before this walk.
      if (keys.has(key.value))
        failAt(
          text,
          key.offset,
          `Duplicate property ${JSON.stringify(key.value)}`,
        );
      keys.add(key.value);
      validateTree(value, text, depth + 1);
    }
  } else if (node.type === 'array') {
    for (const item of node.children ?? []) validateTree(item, text, depth + 1);
  }
}

/** Strictly validate a bounded object, then enumerate properties outside arrays. */
export function analyzeJson(text: string): Analysis {
  if (Buffer.byteLength(text, 'utf8') > LIMITS.bytes)
    throw new Error('Input exceeds the 1 MiB limit. Use a smaller example.');
  if (!text.trim())
    throw new Error(
      'Paste a JSON object or load one from the editor to begin.',
    );
  // Bound nesting BEFORE recursive parsing, including malformed deeply nested input.
  const scanner = createScanner(text, false);
  let containers = 0;
  for (
    let token = scanner.scan();
    token !== SyntaxKind.EOF;
    token = scanner.scan()
  ) {
    if (
      token === SyntaxKind.OpenBraceToken ||
      token === SyntaxKind.OpenBracketToken
    )
      containers++;
    if (containers > LIMITS.depth + 1)
      failAt(
        text,
        scanner.getTokenOffset(),
        `Nesting exceeds ${LIMITS.depth} levels`,
      );
    if (
      token === SyntaxKind.CloseBraceToken ||
      token === SyntaxKind.CloseBracketToken
    )
      containers--;
  }
  const errors: ParseError[] = [];
  const tree = parseTree(text, errors, {
    allowTrailingComma: false,
    disallowComments: true,
    allowEmptyContent: false,
  });
  const first = errors[0];
  if (first)
    failAt(
      text,
      first.offset,
      `Invalid JSON: ${printParseErrorCode(first.error)}. Comments and trailing commas are not supported`,
    );
  if (!tree || tree.type !== 'object')
    throw new Error(
      'The root must be a JSON object, for example {"email":"alex@example.com"}.',
    );
  validateTree(tree, text, 0);
  // JSON.parse creates own data properties even for "__proto__". Do not replace
  // this with a parser that assigns attacker-controlled keys through setters.
  const value = JSON.parse(text) as JsonObject;
  const fields: FieldDescriptor[] = [];
  let fieldPathBytes = 0;
  function visit(object: JsonObject, parent: string[]): void {
    for (const key of Object.keys(object)) {
      const child = object[key]!;
      const segments = [...parent, key];
      const pointer = toPointer(segments);
      fieldPathBytes += Buffer.byteLength(pointer, 'utf8');
      if (fieldPathBytes > 2 * LIMITS.bytes)
        throw new Error(
          'Combined field paths exceed 2 MiB. Shorten property names or use a smaller example.',
        );
      fields.push({
        pointer,
        segments,
        type: jsonType(child),
      });
      if (jsonType(child) === 'object') visit(child as JsonObject, segments);
    }
  }
  visit(value, []);
  return { value, fields };
}
