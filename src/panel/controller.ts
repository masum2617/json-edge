import * as vscode from 'vscode';
import { prepareInput, fillDummyValues } from '../core/prepare';
import { analyzeJson } from '../core/analyze';
import { GenerationSession } from '../core/session';
import { parseClientMessage, type HostMessage } from '../protocol';
import { exportCases } from '../output';
import { panelHtml } from './html';

/** One panel owns one memory-only session; disposal releases payloads/results. */
export class EdgeCasePanel implements vscode.Disposable {
  private readonly session = new GenerationSession();
  private readonly subscriptions: vscode.Disposable[] = [];
  private exporting = false;
  private disposed = false;

  private constructor(
    readonly panel: vscode.WebviewPanel,
    private readonly readEditor: () => string,
  ) {
    panel.webview.onDidReceiveMessage(
      (message: unknown) => {
        void this.handleMessage(message);
      },
      undefined,
      this.subscriptions,
    );
    panel.onDidDispose(() => this.dispose(), undefined, this.subscriptions);
  }

  static async create(
    root: vscode.Uri,
    readEditor: () => string,
  ): Promise<EdgeCasePanel> {
    const panel = vscode.window.createWebviewPanel(
      'jsonEdgeCaseMaker',
      'JSON Edge Case Maker',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true, // Memory-only; never use webview.setState for payloads.
        localResourceRoots: [vscode.Uri.joinPath(root, 'dist', 'media')],
      },
    );
    const controller = new EdgeCasePanel(panel, readEditor);
    try {
      panel.webview.html = await panelHtml(panel.webview, root);
    } catch (error) {
      controller.dispose();
      throw error;
    }
    return controller;
  }

  private send(message: HostMessage): void {
    if (!this.disposed) void this.panel.webview.postMessage(message);
  }

  /** Internal entry point, also exercised by extension-host integration tests. */
  async handleMessage(raw: unknown): Promise<void> {
    let revision: number | undefined;
    try {
      const message = parseClientMessage(raw);
      if ('revision' in message) revision = message.revision;
      switch (message.type) {
        case 'ready':
        case 'loadEditor': {
          if (revision !== undefined) this.session.invalidate(revision);
          const text = this.readEditor();
          // Keep failed imports visible for correction rather than silently losing them.
          try {
            const prepared = text.trim()
              ? prepareInput(text)
              : { text, note: '' };
            this.send({ type: 'source', revision, ...prepared });
          } catch (error) {
            this.send({
              type: 'source',
              revision,
              text,
              note: error instanceof Error ? error.message : String(error),
            });
          }
          break;
        }
        case 'format':
        case 'dummy': {
          this.session.invalidate(message.revision);
          const prepared =
            message.type === 'dummy'
              ? fillDummyValues(message.text)
              : prepareInput(message.text);
          this.send({
            type: 'source',
            revision: message.revision,
            ...prepared,
          });
          break;
        }
        case 'invalidate':
          this.session.invalidate(message.revision);
          break;
        case 'analyze':
          this.send({
            type: 'fields',
            revision: message.revision,
            fields: analyzeJson(message.text).fields,
          });
          break;
        case 'generate': {
          const result = this.session.generate(
            message.revision,
            message.text,
            message.fields,
            message.mutations,
          );
          this.send({ type: 'results', revision: message.revision, ...result });
          break;
        }
        case 'copy': {
          const [item] = this.session.selected(message.revision, message.ids);
          if (message.ids.length !== 1 || !item)
            throw new Error('Choose one case to copy.');
          await vscode.env.clipboard.writeText(item.json);
          this.send({ type: 'notice', message: 'JSON copied to clipboard.' });
          break;
        }
        case 'export': {
          if (this.exporting)
            throw new Error('An export is already in progress.');
          this.session.selected(message.revision, message.ids);
          this.exporting = true;
          try {
            const folders = await vscode.window.showOpenDialog({
              canSelectFiles: false,
              canSelectFolders: true,
              canSelectMany: false,
              openLabel: 'Export cases here',
              title:
                'Choose a parent folder — a new case folder will be created',
            });
            if (!folders?.[0]) {
              this.send({
                type: 'notice',
                message: 'Export cancelled. No files written.',
              });
              break;
            }
            if (this.disposed) break;
            const cases = this.session.selected(message.revision, message.ids);
            this.send({
              type: 'notice',
              message: await exportCases(folders[0], cases),
            });
          } finally {
            this.exporting = false;
          }
          break;
        }
      }
    } catch (error) {
      this.send({
        type: 'error',
        revision,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.session.invalidate(Number.MAX_SAFE_INTEGER);
    this.subscriptions.forEach((subscription) => subscription.dispose());
    this.panel.dispose();
  }
}
