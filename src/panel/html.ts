import * as vscode from 'vscode';
import { randomBytes } from 'node:crypto';

/** Only controlled resource URLs enter the template. Payloads travel via messages. */
export async function panelHtml(
  webview: vscode.Webview,
  root: vscode.Uri,
): Promise<string> {
  const media = vscode.Uri.joinPath(root, 'dist', 'media');
  const template = Buffer.from(
    await vscode.workspace.fs.readFile(
      vscode.Uri.joinPath(media, 'panel.html'),
    ),
  ).toString('utf8');
  const nonce = randomBytes(18).toString('base64');
  const resource = (name: string) =>
    webview.asWebviewUri(vscode.Uri.joinPath(media, name)).toString();
  return template
    .replaceAll('{{CSP}}', webview.cspSource)
    .replaceAll('{{NONCE}}', nonce)
    .replaceAll('{{STYLE}}', resource('main.css'))
    .replaceAll('{{SCRIPT}}', resource('main.js'));
}
