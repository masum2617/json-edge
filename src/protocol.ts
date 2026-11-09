import {
  LIMITS,
  MUTATIONS,
  type FieldDescriptor,
  type GeneratedCase,
  type MutationKind,
} from './core/types';

export type ClientMessage =
  | { type: 'ready' }
  | { type: 'loadEditor'; revision: number }
  | { type: 'format' | 'dummy'; revision: number; text: string }
  | { type: 'invalidate'; revision: number }
  | { type: 'analyze'; revision: number; text: string }
  | {
      type: 'generate';
      revision: number;
      text: string;
      fields: string[];
      mutations: MutationKind[];
    }
  | { type: 'copy' | 'export'; revision: number; ids: string[] };
export type HostMessage =
  | { type: 'source'; text: string; revision?: number; note?: string }
  | { type: 'fields'; revision: number; fields: FieldDescriptor[] }
  | {
      type: 'results';
      revision: number;
      cases: GeneratedCase[];
      skipped: number;
    }
  | { type: 'error'; revision?: number; message: string }
  | { type: 'notice'; message: string };

function strings(value: unknown, max: number): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= max &&
    value.every(
      (item) => typeof item === 'string' && item.length <= LIMITS.bytes,
    )
  );
}

/** Webview messages are untrusted input, even though our own UI sends them. */
export function parseClientMessage(value: unknown): ClientMessage {
  if (!value || typeof value !== 'object')
    throw new Error('Invalid panel message.');
  const m = value as Record<string, unknown>;
  if (m.type === 'ready') return { type: 'ready' };
  if (!Number.isSafeInteger(m.revision) || (m.revision as number) < 0)
    throw new Error('Invalid revision.');
  const revision = m.revision as number;
  if (m.type === 'invalidate' || m.type === 'loadEditor')
    return { type: m.type, revision };
  if (m.type === 'copy' || m.type === 'export') {
    if (!strings(m.ids, LIMITS.cases))
      throw new Error('Invalid case selection.');
    return { type: m.type, revision, ids: m.ids };
  }
  if (
    typeof m.text !== 'string' ||
    Buffer.byteLength(m.text, 'utf8') > LIMITS.bytes
  )
    throw new Error('Input exceeds the 1 MiB limit or is not text.');
  if (m.type === 'analyze' || m.type === 'format' || m.type === 'dummy')
    return { type: m.type, revision, text: m.text };
  if (
    m.type === 'generate' &&
    strings(m.fields, 100000) &&
    strings(m.mutations, MUTATIONS.length) &&
    m.mutations.every((item) => MUTATIONS.includes(item as MutationKind))
  ) {
    return {
      type: 'generate',
      revision,
      text: m.text,
      fields: m.fields,
      mutations: m.mutations as MutationKind[],
    };
  }
  throw new Error('Unknown or malformed panel message.');
}
