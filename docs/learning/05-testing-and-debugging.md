# 5. Testing and debugging

## Three test boundaries

**Unit tests** run under Node using its built-in test runner. `tests/unit/` checks strict parsing, nested fields, mutation output, baseline preservation, unsafe keys, limits, messages, freshness, and export reporting. Run `npm test`.

**Extension-host integration tests** run inside actual VS Code through `@vscode/test-electron`. They activate the extension, check registration, create a real panel, exercise clipboard behavior, and verify local exports in a temporary folder. Run `npm run test:integration`. Set `VSCODE_EXECUTABLE_PATH` to a compatible installed executable to avoid downloading Stable. The test temporarily changes the clipboard and restores its previous text.

**Panel UI tests** run the real compiled UI and real engine in Chromium, with only the VS Code message transport substituted. Run `npx playwright install chromium` once, then `npm run test:ui`. They exercise selections, previews, invalidation, error messages, injection resistance, light/dark/forced-color accessibility checks, and narrow layouts. Snippet tests also exercise both editor examples, the dummy-values action, Enter/caret behavior and late preparation responses. These tests do not claim to test VS Code's native clipboard/folder dialogs; the platform suite covers those boundaries separately.

`npm run test:package` installs the exact generated VSIX into a temporary extension directory and runs the platform suite against its installed files. This catches missing package assets that development-host tests would not find.

## Debug a failure

- Parsing/generation: run a focused Node test with `--test-name-pattern`, or debug its compiled test through VS Code.
- Host: use F5, a breakpoint in `handleMessage`, and the Extension Development Host output.
- UI: use **Developer: Open Webview Developer Tools** where available, inspect the browser console, and check CSP errors. Payloads should not be logged.
- UI tests: use `npx playwright test --headed` or inspect retained traces from a failed run.

Before a release, run `npm run check`, the integration/UI suites, package, and packaged smoke tests. Then manually inspect light, dark, and high-contrast themes and keyboard-only operation in VS Code.

The CI workflow defines macOS, Windows, and Linux jobs. Local macOS results are not proof that those jobs have run elsewhere. Record actual execution results in release notes.

Next: [packaging and publishing](06-packaging-and-publishing.md).

Reference: [Testing Extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension).
