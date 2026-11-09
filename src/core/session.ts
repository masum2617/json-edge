import { generateCases } from './generate';
import type { GeneratedCase, GenerationResult, MutationKind } from './types';

/** In-memory session. A revision ties results to the exact input AND options. */
export class GenerationSession {
  private revision = -1;
  private generatedRevision = -1;
  private cases: GeneratedCase[] = [];

  invalidate(revision: number): void {
    if (revision < this.revision) return;
    this.revision = revision;
    this.generatedRevision = -1;
    this.cases = [];
  }

  generate(
    revision: number,
    text: string,
    fields: string[],
    mutations: MutationKind[],
  ): GenerationResult {
    if (revision < this.revision)
      throw new Error('Input changed. Generate again.');
    this.invalidate(revision);
    const result = generateCases(text, fields, mutations);
    this.cases = result.cases;
    this.generatedRevision = revision;
    return result;
  }

  /** Recheck after awaiting dialogs too: input can change while a dialog is open. */
  selected(revision: number, ids: readonly string[]): GeneratedCase[] {
    if (revision !== this.revision || revision !== this.generatedRevision)
      throw new Error(
        'Results are outdated. Generate again before copying or exporting.',
      );
    if (
      !ids.length ||
      ids.length > this.cases.length ||
      new Set(ids).size !== ids.length
    )
      throw new Error('Select one or more distinct cases.');
    return ids.map((id) => {
      const item = this.cases.find((entry) => entry.id === id);
      if (!item) throw new Error('Unknown case. Generate again.');
      return item;
    });
  }
}
