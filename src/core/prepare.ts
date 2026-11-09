import { parse, tokenizer, type Expression, type Property } from 'acorn';
import { analyzeJson } from './analyze';
import { LIMITS, type JsonObject, type JsonValue } from './types';

export interface PreparedInput {
  text: string;
  note: string;
}

/** Bound parser work before building an AST; user snippets are never executed. */
function guardSnippet(text: string): void {
  if (Buffer.byteLength(text, 'utf8') > LIMITS.bytes)
    throw new Error('Input exceeds the 1 MiB limit. Use a smaller example.');
  let depth = 0;
  let tokens = 0;
  for (const token of tokenizer(text, { ecmaVersion: 2022 })) {
    if (++tokens > 100000)
      throw new Error('Snippet is too complex. Select a smaller object.');
    if (['{', '[', '(', '${'].includes(token.type.label)) depth++;
    if (depth > LIMITS.depth + 2)
      throw new Error(`Nesting exceeds ${LIMITS.depth} levels.`);
    if (['}', ']', ')'].includes(token.type.label)) depth--;
  }
}

function propertyName(property: Property): string {
  if (property.computed)
    throw new Error(
      'Computed property names cannot be resolved. Replace them with literal keys.',
    );
  if (property.kind !== 'init' || property.method)
    throw new Error(
      'Methods and getters/setters cannot be converted. Select data properties only.',
    );
  if (property.key.type === 'Identifier') return property.key.name;
  if (
    property.key.type === 'Literal' &&
    (typeof property.key.value === 'string' ||
      typeof property.key.value === 'number')
  )
    return String(property.key.value);
  throw new Error('Use a literal property name.');
}

/** Convert JSON or an object/property-list snippet into two-space strict JSON.
 * Literal values survive; runtime expressions become empty strings, not guesses.
 * Acorn only parses syntax. Never replace this boundary with eval/Function/import.
 */
export function prepareInput(text: string): PreparedInput {
  if (!text.trim())
    throw new Error('Paste a JSON object or object properties to begin.');
  if (Buffer.byteLength(text, 'utf8') > LIMITS.bytes)
    throw new Error('Input exceeds the 1 MiB limit. Use a smaller example.');
  let strictValue: JsonObject | undefined;
  try {
    strictValue = analyzeJson(text).value;
  } catch {
    // Only explicit import/format accepts JavaScript syntax. Generation stays strict.
  }
  if (strictValue) {
    const formatted = JSON.stringify(strictValue, null, 2);
    // Pretty-printing can exceed the input bound even when compact JSON fits.
    // Keep this outside the fallback catch so failure cannot bypass the limit.
    analyzeJson(formatted);
    return {
      text: formatted,
      note: 'Formatted JSON with two-space indentation.',
    };
  }
  const trimmed = text.trim();
  const source = trimmed.startsWith('{')
    ? `(${trimmed}\n)`
    : `({\n${trimmed}\n})`;
  let expression: Expression;
  try {
    guardSnippet(source);
    const program = parse(source, { ecmaVersion: 2022 });
    const statement = program.body[0];
    if (
      program.body.length !== 1 ||
      statement?.type !== 'ExpressionStatement' ||
      statement.expression.type !== 'ObjectExpression'
    )
      throw new Error('Select an object or a comma-separated property list.');
    expression = statement.expression;
  } catch (error) {
    if (error instanceof RangeError)
      throw new Error('Snippet is too complex. Select a smaller object.');
    throw new Error(
      `Cannot convert snippet: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  let placeholders = 0;
  function convert(node: Expression, depth: number): JsonValue {
    if (depth > LIMITS.depth)
      throw new Error(`Nesting exceeds ${LIMITS.depth} levels.`);
    if (node.type === 'Literal') {
      const value = node.value;
      if (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'boolean'
      )
        return value;
      if (typeof value === 'number') {
        if (
          !Number.isFinite(value) ||
          (Number.isInteger(value) && !Number.isSafeInteger(value))
        )
          throw new Error(
            'Number cannot be represented safely; encode large identifiers as strings.',
          );
        return value;
      }
      if (typeof value === 'bigint')
        throw new Error(
          'BigInt is not JSON. Encode large identifiers as strings.',
        );
    }
    if (
      node.type === 'UnaryExpression' &&
      ['-', '+'].includes(node.operator) &&
      node.argument.type === 'Literal' &&
      typeof node.argument.value === 'number'
    ) {
      const value = convert(node.argument, depth) as number;
      return node.operator === '-' ? -value : value;
    }
    if (node.type === 'TemplateLiteral' && !node.expressions.length)
      return node.quasis[0]?.value.cooked ?? '';
    if (node.type === 'ObjectExpression') {
      // A null prototype treats __proto__ as an ordinary own JSON property.
      const result = Object.create(null) as JsonObject;
      for (const property of node.properties) {
        if (property.type === 'SpreadElement')
          throw new Error(
            'Spread properties cannot be resolved. Replace spreads with explicit properties.',
          );
        const name = propertyName(property);
        if (Object.hasOwn(result, name))
          throw new Error(`Duplicate property ${JSON.stringify(name)}.`);
        result[name] = convert(property.value, depth + 1);
      }
      return result;
    }
    if (node.type === 'ArrayExpression') {
      return node.elements.map((item) => {
        if (!item || item.type === 'SpreadElement')
          throw new Error(
            'Array holes and spreads cannot be converted. Use explicit array values.',
          );
        return convert(item, depth + 1);
      });
    }
    placeholders++;
    return '';
  }
  const result = JSON.stringify(convert(expression, 0), null, 2);
  analyzeJson(result); // Reapply the same output, depth, numeric and field-path limits.
  return {
    text: result,
    note: `Converted object syntax to JSON. ${placeholders} runtime expression${placeholders === 1 ? '' : 's'} replaced with empty strings; no code executed.`,
  };
}

function exampleFor(key: string): JsonValue {
  const name = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
  if (name.endsWith('id') || name === 'id') return 1;
  if (
    /^(is|has|can)[A-Z_]/.test(key) ||
    /^(active|enabled|deleted)$/.test(name)
  )
    return true;
  if (/(qty|quantity|count|age|price|amount|total|balance|stock)$/.test(name))
    return name === 'age' ? 25 : 10;
  if (name.includes('email')) return 'alex@example.com';
  if (name.includes('phone')) return '+15555550123';
  if (name.includes('date')) return '2026-01-01';
  if (name.includes('url')) return 'https://example.com';
  if (name === 'batchnumber') return 'BATCH-001';
  if (name === 'suppliername') return 'Example Supplier';
  if (name === 'warehousename') return 'Main Warehouse';
  if (name === 'city') return 'Dhaka';
  if (name === 'name' || name.endsWith('name')) return 'Alex';
  return 'example';
}

/** Fill only empty-string/null leaves; preserve supplied non-empty example data.
 * Names provide hints, not a schema. The user reviews all inferred values.
 */
export function fillDummyValues(text: string): PreparedInput {
  const prepared = prepareInput(text);
  const { value } = analyzeJson(prepared.text);
  let filled = 0;
  function fill(item: JsonValue, key: string): JsonValue {
    if (item === '' || item === null) {
      filled++;
      return exampleFor(key);
    }
    if (Array.isArray(item)) return item.map((child) => fill(child, key));
    if (typeof item === 'object') {
      for (const name of Object.keys(item))
        item[name] = fill(item[name]!, name);
    }
    return item;
  }
  const result = JSON.stringify(fill(value, ''), null, 2);
  analyzeJson(result);
  return {
    text: result,
    note: `${prepared.note} Filled ${filled} empty/null value${filled === 1 ? '' : 's'} using property-name hints. Review the values and types before generating.`,
  };
}
