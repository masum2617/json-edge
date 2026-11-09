import type { GeneratedCase } from './types';

export interface ExportEntry {
  filename: string;
  contents: string;
}
export interface ExportReport {
  written: string[];
  failed?: string;
  error?: string;
}

/** Filenames use controlled indexes, never property paths supplied by users. */
export function exportEntries(cases: readonly GeneratedCase[]): ExportEntry[] {
  const entries = cases.map((item, index) => ({
    filename: `${String(index + 1).padStart(3, '0')}-${item.mutation}.json`,
    contents: item.json + '\n',
  }));
  const index = cases.map((item, i) => ({
    file: entries[i]!.filename,
    path: item.pointer,
    mutation: item.mutation,
    explanation: item.explanation,
  }));
  return [
    ...entries,
    {
      filename: 'index.json',
      contents:
        JSON.stringify(
          {
            formatVersion: 1,
            description:
              'Candidate inputs. Acceptance depends on your application rules.',
            cases: index,
          },
          null,
          2,
        ) + '\n',
    },
  ];
}

/** Sequential writes make partial failure reporting exact and understandable. */
export async function writeEntries(
  entries: readonly ExportEntry[],
  write: (entry: ExportEntry) => Promise<void>,
): Promise<ExportReport> {
  const written: string[] = [];
  for (const entry of entries) {
    try {
      await write(entry);
      written.push(entry.filename);
    } catch (error) {
      return {
        written,
        failed: entry.filename,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  return { written };
}
