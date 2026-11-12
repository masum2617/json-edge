import * as vscode from 'vscode';
import { registerActivityLauncher } from './sidebar/launcher';
import { EdgeCasePanel } from './panel/controller';

/** Called lazily when the command or Activity Bar view is first invoked. */
export function activate(context: vscode.ExtensionContext): void {
  let lastEditor = vscode.window.activeTextEditor;
  let controller: EdgeCasePanel | undefined;
  let opening: Promise<void> | undefined;
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) lastEditor = editor;
    }),
  );
  const readEditor = (): string => {
    const editor = vscode.window.activeTextEditor ?? lastEditor;
    if (!editor || editor.document.isClosed) return '';
    if (!editor.selection.isEmpty)
      return editor.document.getText(editor.selection);
    return editor.document.languageId === 'json' ||
      editor.document.languageId === 'jsonc'
      ? editor.document.getText()
      : '';
  };
  async function createGenerator(): Promise<void> {
    try {
      controller = await EdgeCasePanel.create(context.extensionUri, readEditor);
      controller.panel.onDidDispose(
        () => {
          controller = undefined;
        },
        undefined,
        context.subscriptions,
      );
    } catch (error) {
      void vscode.window.showErrorMessage(
        `JSON Edge: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  async function openGenerator(): Promise<void> {
    if (controller) {
      controller.panel.reveal();
      return;
    }
    // All callers await the same opening task instead of racing duplicate tabs.
    if (!opening)
      opening = createGenerator().finally(() => {
        opening = undefined;
      });
    await opening;
  }
  context.subscriptions.push(
    vscode.commands.registerCommand('jsonEdge.open', openGenerator),
    // An internal command keeps icon toggling separate from always-open actions.
    vscode.commands.registerCommand('jsonEdge.toggle', async () => {
      if (controller?.panel.visible) {
        // Same memory-clearing lifecycle as closing the generator tab manually.
        controller.dispose();
        return;
      }
      await openGenerator();
    }),
  );
  registerActivityLauncher(context, async () => {
    await vscode.commands.executeCommand('jsonEdge.toggle');
  });
  context.subscriptions.push({ dispose: () => controller?.dispose() });
}
