# Development

Use Node.js 22.14+ or Node 24 LTS and npm. Install with `npm ci`, then `npm run compile`. Open the project folder and press F5. In the Extension Development Host, click the JSON Twist icon or run JSON Twist: Open.

## Commands

| Command                           | Purpose                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `npm run compile`                 | Compile the host, check webview types, and copy local UI assets.               |
| `npm run check`                   | Type checks, ESLint, Prettier, and Node unit tests.                            |
| `npm run test:integration`        | Official VS Code extension-host checks.                                        |
| `npx playwright install chromium` | Install the development UI-test browser once.                                  |
| `npm run test:ui`                 | Real UI + engine with a substituted VS Code transport.                         |
| `npm run package`                 | Create a locally installable VSIX under artifacts/.                            |
| `npm run test:package`            | Install that exact VSIX in a temporary profile and test its installed runtime. |
| `npm run release:check`           | Validate required release identity, metadata and public media.                 |
| `npm run package:release`         | Block placeholder identities, then run checks and package.                     |
| `npm run demo:record`             | Record the actual installed extension into GIF/MP4 and screenshots.            |

`VSCODE_EXECUTABLE_PATH` can select an installed VS Code binary rather than downloading Stable. UI tests accept `CHROME_PATH` for installed Chrome. The watch command recompiles host TypeScript only; run compile after webview/HTML/CSS changes, then reload the development host.

## Structure and learning

The host entry point registers commands and the Activity Bar launcher. The panel controller handles platform actions and typed messages. `src/core/` validates/prepares JSON, generates isolated cases, tracks freshness and describes exports. The webview renders text safely and gathers user choices. `src/output.ts` owns clipboard/export platform integration.

Start with [Extension basics](learning/01-extension-basics.md), then follow the seven numbered learning chapters. Important exported functions have JSDoc; comments explain isolation, security boundaries and VS Code-specific behavior.

## Record public demo assets

The optional recorder runs a disposable VS Code profile with synthetic profile data. It does not use your regular workspace, extensions, settings or customer data. On macOS it restores clipboard text after the Copy JSON demonstration.

Set `VSCODE_EXECUTABLE_PATH` to the Code executable and `FFMPEG_PATH` to an FFmpeg binary with GIF and H.264 encoders. Build the VSIX first, then run `npm run demo:record`. Recording tooling is development-only; FFmpeg is not an extension dependency. The recorder writes the looping GIF, MP4, media manifest and numbered PNG screenshots under docs/.

Use the GIF as the README image and the MP4 as a normal watch/download link. Inspect the resulting Marketplace detail page after upload; its rendering is the final check for animation. See [Demo storyboard](release/DEMO.md).

The local optional smoke script `scripts/smoke-editor.cjs` also checks real editor selection, copy/export, one-click launching and source preservation. It is intended for the available macOS development machine.

## Release verification

CI defines Linux, macOS and Windows jobs using Node 24. A workflow definition is not evidence those jobs passed: run and inspect the actual checks before public upload. The [publishing guide](PUBLISHING.md) lists the owner steps, public asset checks and release gate.
