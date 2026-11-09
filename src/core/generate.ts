import { analyzeJson } from './analyze';
import {
  LIMITS,
  MUTATIONS,
  jsonType,
  type FieldDescriptor,
  type GenerationResult,
  type JsonObject,
  type JsonValue,
  type MutationKind,
} from './types';

function replacement(
  value: JsonValue,
  mutation: MutationKind,
): JsonValue | undefined {
  if (mutation === 'null') return null;
  if (mutation === 'empty') {
    if (typeof value === 'string') return '';
    if (Array.isArray(value)) return [];
    if (value !== null && typeof value === 'object') return {};
    return undefined;
  }
  switch (jsonType(value)) {
    case 'string':
      return 123;
    case 'number':
      return 'not-a-number';
    case 'boolean':
      return 'not-a-boolean';
    case 'object':
      return [];
    case 'array':
      return {};
    case 'null':
      return 'example';
  }
}

function parentAt(root: JsonObject, field: FieldDescriptor): JsonObject {
  let parent = root;
  for (const key of field.segments.slice(0, -1))
    parent = parent[key] as JsonObject;
  return parent;
}

/** Generate independent, deterministic candidates without touching the baseline. */
export function generateCases(
  text: string,
  pointers: readonly string[],
  mutations: readonly MutationKind[],
): GenerationResult {
  const analysis = analyzeJson(text);
  const selected = new Set(pointers);
  const methods = new Set(mutations);
  if (!selected.size || !methods.size)
    throw new Error('Select at least one field and one variation.');
  if (pointers.length !== selected.size || mutations.length !== methods.size)
    throw new Error('Duplicate selections are not allowed.');
  if ([...methods].some((method) => !MUTATIONS.includes(method)))
    throw new Error('Unknown variation.');
  const knownPointers = new Set(analysis.fields.map((field) => field.pointer));
  if ([...selected].some((pointer) => !knownPointers.has(pointer))) {
    throw new Error(
      'A selected field no longer exists. Refresh the field list.',
    );
  }
  const cases: GenerationResult['cases'] = [];
  const seen = new Set<string>();
  let skipped = 0;
  let outputBytes = 0;
  for (const field of analysis.fields.filter((item) =>
    selected.has(item.pointer),
  )) {
    for (const mutation of MUTATIONS.filter((item) => methods.has(item))) {
      const key = field.segments.at(-1)!;
      const original = parentAt(analysis.value, field)[key]!;
      const next =
        mutation === 'missing' ? undefined : replacement(original, mutation);
      // Skip no-ops BEFORE cloning: thousands of null/empty fields must stay cheap.
      if (
        mutation !== 'missing' &&
        (next === undefined ||
          JSON.stringify(next) === JSON.stringify(original))
      ) {
        skipped++;
        continue;
      }
      // A fresh deep clone for EACH applicable case prevents cumulative mutations.
      const copy = JSON.parse(JSON.stringify(analysis.value)) as JsonObject;
      const parent = parentAt(copy, field);
      let detail: string;
      if (mutation === 'missing') {
        delete parent[key];
        detail = 'Removed this property.';
      } else {
        // Defining an own data property also handles __proto__ without invoking a setter.
        Object.defineProperty(parent, key, {
          value: next,
          enumerable: true,
          writable: true,
          configurable: true,
        });
        detail = `Replaced ${jsonType(original)} with ${JSON.stringify(next)} (${jsonType(next!)}).`;
      }
      const json = JSON.stringify(copy, null, 2);
      if (seen.has(json)) {
        skipped++;
        continue;
      }
      if (cases.length >= LIMITS.cases)
        throw new Error(
          `More than ${LIMITS.cases} cases would be generated. Select fewer fields or variations; no results were truncated.`,
        );
      outputBytes += Buffer.byteLength(json, 'utf8');
      if (outputBytes > 16 * 1024 * 1024)
        throw new Error(
          'Generated output exceeds 16 MiB. Use a smaller example or select fewer cases.',
        );
      seen.add(json);
      const label = {
        missing: 'Missing field',
        null: 'Null value',
        empty: 'Empty value',
        wrongType: 'Wrong type',
      }[mutation];
      cases.push({
        id: String(cases.length + 1),
        pointer: field.pointer,
        mutation,
        title: `${field.pointer} — ${label}`,
        explanation: `${detail} Path: ${field.pointer}. Other properties retain their baseline values. This is a candidate input, not a prediction of validity.`,
        json,
      });
    }
  }
  return { cases, skipped };
}
