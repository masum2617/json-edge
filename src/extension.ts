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
        `JSON Twist: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  context.subscriptions.push(
    vscode.commands.registerCommand('jsonEdgeCaseMaker.open', async () => {
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
    }),
  );
  registerActivityLauncher(context, async () => {
    await vscode.commands.executeCommand('jsonEdgeCaseMaker.open');
  });
  context.subscriptions.push({ dispose: () => controller?.dispose() });
}
