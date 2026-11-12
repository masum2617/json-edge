import * as vscode from 'vscode';

/** Bridge the Activity Bar's view-container API to the requested one-click editor.
 * VS Code contributes icons through views, rather than arbitrary icon commands.
 * When our small launcher view becomes visible, toggle the generator and close
 * that launcher sidebar, so users do not have to click a second button.
 */
export function registerActivityLauncher(
  context: vscode.ExtensionContext,
  toggleGenerator: () => Promise<void>,
): void {
  const view = vscode.window.createTreeView<never>('jsonEdge.generatedFiles', {
    treeDataProvider: {
      getTreeItem: () => {
        throw new Error('The launcher has no tree items.');
      },
      getChildren: () => [],
    },
  });
  view.message = 'Toggling JSON Edge…';
  let launching = false;
  let queued = false;
  let disposed = false;
  async function launch(): Promise<void> {
    if (launching || disposed) return;
    launching = true;
    try {
      // Remember a new icon click while VS Code is still closing the previous
      // launcher sidebar. Ignoring that visibility event would lose the click.
      while (queued && !disposed) {
        queued = false;
        try {
          await toggleGenerator();
          // The primary sidebar can be on either side of the editor. Do not
          // close a different view if the user switched away while we waited.
          if (!disposed && view.visible)
            await vscode.commands.executeCommand(
              'workbench.action.closeSidebar',
            );
        } catch (error) {
          if (!disposed)
            void vscode.window.showErrorMessage(
              `JSON Edge: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
      }
    } finally {
      launching = false;
    }
  }
  function requestLaunch(): void {
    queued = true;
    void launch();
  }
  context.subscriptions.push(
    view,
    view.onDidChangeVisibility((event) => {
      if (event.visible) requestLaunch();
    }),
    {
      dispose: () => {
        disposed = true;
      },
    },
  );
  // First activation can happen after the icon's view is already visible.
  if (view.visible) requestLaunch();
}
