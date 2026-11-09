import * as vscode from 'vscode';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { exportEntries, writeEntries } from './core/export';
import type { GeneratedCase } from './core/types';

/** Exclusive creation prevents collisions, even if another process races us. */
export async function exportCases(
  folder: vscode.Uri,
  cases: GeneratedCase[],
): Promise<string> {
  if (folder.scheme !== 'file')
    throw new Error('Version 0.1 supports export to local folders only.');
  const destination = vscode.Uri.joinPath(
    folder,
    `json-edge-cases-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`,
  );
  await mkdir(destination.fsPath); // No recursive:true: an existing directory must fail.
  const report = await writeEntries(exportEntries(cases), async (entry) => {
    await writeFile(
      vscode.Uri.joinPath(destination, entry.filename).fsPath,
      entry.contents,
      { encoding: 'utf8', flag: 'wx' },
    );
  });
  if (report.failed)
    throw new Error(
      `Export stopped at ${report.failed}: ${report.error}. Already written (${report.written.length}): ${report.written.join(', ') || 'none'}. Folder: ${destination.fsPath}`,
    );
  return `Exported ${cases.length} cases and index.json to ${destination.fsPath}`;
}
