/** JSON data is deliberately narrower than arbitrary JavaScript values. */
export type JsonValue =
  null | boolean | number | string | JsonValue[] | JsonObject;
export interface JsonObject {
  [key: string]: JsonValue;
}
export type JsonType =
  'null' | 'boolean' | 'number' | 'string' | 'array' | 'object';
export type MutationKind = 'missing' | 'null' | 'empty' | 'wrongType';
export const MUTATIONS: readonly MutationKind[] = [
  'missing',
  'null',
  'empty',
  'wrongType',
];
export const LIMITS = { bytes: 1024 * 1024, depth: 32, cases: 250 } as const;

export interface FieldDescriptor {
  /** RFC 6901 JSON Pointer: unlike dot notation, this preserves unusual keys. */
  pointer: string;
  segments: string[];
  type: JsonType;
}
export interface Analysis {
  value: JsonObject;
  fields: FieldDescriptor[];
}
export interface GeneratedCase {
  id: string;
  pointer: string;
  mutation: MutationKind;
  title: string;
  explanation: string;
  json: string;
}
export interface GenerationResult {
  cases: GeneratedCase[];
  skipped: number;
}

export function jsonType(value: JsonValue): JsonType {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value as Exclude<JsonType, 'null' | 'array'>;
}
