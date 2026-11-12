# Development

Use Node.js 22.14+ or Node 24 LTS and npm. Install with `npm ci`, then `npm run compile`. Open the project folder and press F5. In the Extension Development Host, click the JSON Edge icon or run JSON Edge: Open.

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

`VSCODE_EXECUTABLE_PATH` can select an installed VS Code binary rather than downloading Stable. UI tests accept `CHROME_PATH` for installed Chrome. The watch command recompiles host TypeScript only; run compile after webview/HTML/CSS changes, then reload the development host.

## Structure and learning

The host entry point registers commands and the Activity Bar launcher. The panel controller handles platform actions and typed messages. `src/core/` validates/prepares JSON, generates isolated cases, tracks freshness and describes exports. The webview renders text safely and gathers user choices. `src/output.ts` owns clipboard/export platform integration.

Start with [Extension basics](learning/01-extension-basics.md), then follow the seven numbered learning chapters. Important exported functions have JSDoc; comments explain isolation, security boundaries and VS Code-specific behavior.

## Public demo media

The owner-provided `docs/media/jsonedgedemo.mp4` is unchanged. Its full-resolution, frame-preserving `jsonedgedemo.gif` is embedded in the README; the original video remains linked. The three selected PNG screenshots replace the earlier captures. See [conversion details](release/DEMO.md) and [screenshots](images/README.md).

GIF supports a limited colour palette and 10 ms timing units, so approximately 30 fps playback is preserved with alternating 30/40 ms delays. Verify frame count, duration, dimensions and first/middle/last frames after conversion. Update the checksums and metadata in `docs/media/demo-manifest.json` when replacing media.

The GIF and MP4 are hosted on GitHub main and excluded from the installed VSIX, keeping the installer small. The old automatic recorder remains removed so it cannot overwrite these selected assets.

The local optional smoke script `scripts/smoke-editor.cjs` also checks real editor selection, copy/export, one-click launching and source preservation. It is intended for the available macOS development machine.

## Release verification

CI defines Linux, macOS and Windows jobs using Node 24. A workflow definition is not evidence those jobs passed: run and inspect the actual checks before public upload. The [publishing guide](PUBLISHING.md) lists the owner steps, public asset checks and release gate.

## Cross-platform CI troubleshooting

The test tooling requires Node.js 22 or newer (CI uses Node 24). `@vscode/test-electron` 3.1+ resolves the current macOS application executable from the app bundle; older versions may try the removed `Contents/MacOS/Electron` path and fail with `ENOENT`. Keep the runner and `package-lock.json` updated together rather than renaming VS Code binaries.

`.gitattributes` keeps text checkouts as LF even when Windows Git uses `core.autocrlf=true`. Prettier explicitly expects LF. If an existing Windows checkout still has CRLF, run `npm run format` and then `npm run check`; a fresh CI checkout applies the attributes automatically. Binary media are excluded from newline conversion.

On Windows, `scripts/test-package.cjs` installs the VSIX by reading the CLI target from the bundled `bin/code.cmd` and running it through `Code.exe` with `ELECTRON_RUN_AS_NODE=1`. Directly spawning `bin/code.cmd` with `execFileSync` fails with `EINVAL`. Keeping arguments as an array avoids shell quoting issues in paths with spaces. The environment override applies only to installation, not the subsequent extension-host tests. VS Code 1.145.2 places resources under a version-specific directory; reading the wrapper supports that layout and older releases without hard-coding the directory. `tests/scripts/vscode-cli.test.mjs` checks both layouts and paths with spaces.

These are validation workflow changes. They do not require publishing a new Marketplace version unless extension runtime or packaged content also changes. Push the fixes and inspect all three operating-system jobs before claiming cross-platform verification.
