import * as vscode from 'vscode';

/** Bridge the Activity Bar's view-container API to the requested one-click editor.
 * VS Code contributes icons through views, rather than arbitrary icon commands.
 * When our small launcher view becomes visible, reveal the generator and close
 * that launcher sidebar, so users do not have to click a second button.
 */
export function registerActivityLauncher(
  context: vscode.ExtensionContext,
  openGenerator: () => Promise<void>,
): void {
  const view = vscode.window.createTreeView<never>('jsonEdge.generatedFiles', {
    treeDataProvider: {
      getTreeItem: () => {
        throw new Error('The launcher has no tree items.');
      },
      getChildren: () => [],
    },
  });
  view.message = 'Opening JSON Edge…';
  let launching = false;
  let disposed = false;
  async function launch(): Promise<void> {
    if (!view.visible || launching || disposed) return;
    launching = true;
    try {
      await openGenerator();
      // This launcher targets its contributed primary Activity Bar location.
      // Do not close a different primary sidebar if the user switched away.
      if (!disposed && view.visible)
        await vscode.commands.executeCommand('workbench.action.closeSidebar');
    } catch (error) {
      if (!disposed)
        void vscode.window.showErrorMessage(
          `JSON Edge: ${error instanceof Error ? error.message : String(error)}`,
        );
    } finally {
      launching = false;
    }
  }
  context.subscriptions.push(
    view,
    view.onDidChangeVisibility((event) => {
      if (event.visible) void launch();
    }),
    {
      dispose: () => {
        disposed = true;
      },
    },
  );
  // First activation can happen after the icon's view is already visible.
  if (view.visible) void launch();
}
