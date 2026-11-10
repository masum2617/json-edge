import { LIMITS, MUTATIONS, type MutationKind } from './types';

/** Stable virtual filenames shared by the panel and optional disk export.
 * Controlled IDs and mutation names keep arbitrary property paths out of filenames.
 */
export function caseFilename(id: string, mutation: MutationKind): string {
  if (
    !/^[1-9]\d*$/.test(id) ||
    Number(id) > LIMITS.cases ||
    !MUTATIONS.includes(mutation)
  )
    throw new Error('Invalid generated file identity. Generate again.');
  return `${id.padStart(3, '0')}-${mutation}.json`;
}
