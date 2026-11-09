import * as vscode from 'vscode';
import { EdgeCasePanel } from './panel/controller';

/** Called lazily when the contributed Open command is first invoked. */
export function activate(context: vscode.ExtensionContext): void {
  let lastEditor = vscode.window.activeTextEditor;
  let controller: EdgeCasePanel | undefined;
  let opening = false;
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
  context.subscriptions.push(
    vscode.commands.registerCommand('jsonEdgeCaseMaker.open', async () => {
      if (controller) {
        controller.panel.reveal(vscode.ViewColumn.Beside);
        return;
      }
      // Repeated commands while the template loads should not open duplicate tabs.
      if (opening) return;
      opening = true;
      try {
        controller = await EdgeCasePanel.create(
          context.extensionUri,
          readEditor,
        );
        controller.panel.onDidDispose(
          () => {
            controller = undefined;
          },
          undefined,
          context.subscriptions,
        );
      } catch (error) {
        void vscode.window.showErrorMessage(
          `JSON Edge Case Maker: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        opening = false;
      }
    }),
  );
  context.subscriptions.push({ dispose: () => controller?.dispose() });
}
