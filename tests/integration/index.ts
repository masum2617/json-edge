import * as vscode from 'vscode';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Executed by @vscode/test-electron inside a real extension host. */
export async function run(): Promise<void> {
  const loadModule = createRequire(__filename);
  const manifest = loadModule(join(__dirname, '../../../package.json')) as {
    publisher: string;
    name: string;
  };
  const extension = vscode.extensions.getExtension(
    `${manifest.publisher}.${manifest.name}`,
  );
  assert.ok(extension, 'Packaged or development extension was discovered');
  // In package tests these imports resolve from the INSTALLED artifact, not dist.
  const { EdgeCasePanel } = loadModule(
    join(extension.extensionPath, 'dist/src/panel/controller'),
  ) as typeof import('../../src/panel/controller');
  const { panelHtml } = loadModule(
    join(extension.extensionPath, 'dist/src/panel/html'),
  ) as typeof import('../../src/panel/html');
  const { exportCases } = loadModule(
    join(extension.extensionPath, 'dist/src/output'),
  ) as typeof import('../../src/output');
  const { generateCases } = loadModule(
    join(extension.extensionPath, 'dist/src/core/generate'),
  ) as typeof import('../../src/core/generate');
  const { prepareInput, fillDummyValues } = loadModule(
    join(extension.extensionPath, 'dist/src/core/prepare'),
  ) as typeof import('../../src/core/prepare');
  const snippet =
    'supplierId, supplierName: supplier?.supplierName, warehouseId, warehouseName: warehouse?.name,';
  assert.deepEqual(JSON.parse(prepareInput(snippet).text), {
    supplierId: '',
    supplierName: '',
    warehouseId: '',
    warehouseName: '',
  });
  assert.deepEqual(JSON.parse(fillDummyValues(snippet).text), {
    supplierId: 1,
    supplierName: 'Example Supplier',
    warehouseId: 1,
    warehouseName: 'Main Warehouse',
  });
  await extension.activate();
  const commands = await vscode.commands.getCommands(true);
  assert.ok(commands.includes('jsonEdgeCaseMaker.open'));
  await vscode.commands.executeCommand('jsonEdgeCaseMaker.open');
  await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

  const original = '{"email":"integration-fixture@example.test","age":25}';
  const document = await vscode.workspace.openTextDocument({
    language: 'json',
    content: original,
  });
  await vscode.window.showTextDocument(document);
  const panel = await EdgeCasePanel.create(
    extension.extensionUri,
    () => original,
  );
  const clipboardBefore = await vscode.env.clipboard.readText();
  try {
    const html = await panelHtml(panel.panel.webview, extension.extensionUri);
    assert.match(html, /default-src 'none'/);
    assert.match(html, /connect-src 'none'/);
    assert.ok(
      !html.includes('integration-fixture@example.test'),
      'Payload is never embedded in HTML',
    );
    await panel.handleMessage({
      type: 'generate',
      revision: 1,
      text: original,
      fields: ['/email'],
      mutations: ['null'],
    });
    await panel.handleMessage({ type: 'copy', revision: 1, ids: ['1'] });
    assert.deepEqual(JSON.parse(await vscode.env.clipboard.readText()), {
      email: null,
      age: 25,
    });
    assert.equal(document.getText(), original, 'Source remains unchanged');
    await panel.handleMessage({ type: 'invalidate', revision: 2 });
    await vscode.env.clipboard.writeText('sentinel');
    await panel.handleMessage({ type: 'copy', revision: 1, ids: ['1'] });
    assert.equal(
      await vscode.env.clipboard.readText(),
      'sentinel',
      'Stale copy is blocked',
    );
  } finally {
    panel.dispose();
    await vscode.env.clipboard.writeText(clipboardBefore);
  }

  const folder = await mkdtemp(join(tmpdir(), 'json-edge-case-integration-'));
  try {
    const cases = generateCases(
      original,
      ['/email'],
      ['null', 'missing'],
    ).cases;
    await exportCases(vscode.Uri.file(folder), cases);
    await exportCases(vscode.Uri.file(folder), cases);
    const runs = await readdir(folder);
    assert.equal(runs.length, 2, 'Each export creates a separate directory');
    for (const run of runs) {
      const directory = join(folder, run);
      assert.deepEqual((await readdir(directory)).sort(), [
        '001-missing.json',
        '002-null.json',
        'index.json',
      ]);
      assert.deepEqual(
        JSON.parse(await readFile(join(directory, '002-null.json'), 'utf8')),
        { email: null, age: 25 },
      );
      assert.equal(
        JSON.parse(await readFile(join(directory, 'index.json'), 'utf8')).cases
          .length,
        2,
      );
    }
    await assert.rejects(
      exportCases(vscode.Uri.parse('untitled:test'), cases),
      /local folders only/,
    );
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
  console.log(
    'Extension host: activation, panel CSP, source preservation, clipboard, stale protection, and local export passed.',
  );
}
