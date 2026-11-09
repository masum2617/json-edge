# 4. The webview, messages, and output

A webview is a browser document inside VS Code. Its JavaScript cannot import `vscode` directly. It obtains a limited bridge with `acquireVsCodeApi()` and sends structured messages using `postMessage`.

## Two execution environments

The host runs `src/panel/controller.ts`; the browser runs `src/webview/main.ts`. Type-only imports let both sides share message definitions without shipping Node APIs into the browser. The build script type-checks the webview and transpiles it into a standalone script; the browser has no runtime npm dependencies.

`parseClientMessage` validates incoming shapes because TypeScript types disappear at runtime. The controller then delegates to the core and sends a typed response. Clipboard and filesystem operations remain on the host.

## Freshness is explicit

Input and option changes increment a revision. Existing results become outdated immediately. Generation stores the revision it produced. Copy/export must name that revision, and the host refuses mismatches even if a button is triggered outside the normal UI.

Export validates once before opening a folder dialog, then again after it returns. The user could change inputs while the dialog was open. After writing begins, it exports the validated snapshot rather than mixing later UI changes into an in-progress batch.

## Preparing and editing input

`loadEditor`, `format`, and `dummy` requests carry the current revision. The controller delegates conversion to `prepareInput`/`fillDummyValues`, then sends a `source` message with the formatted text, revision and explanation. A delayed response cannot overwrite text typed after the request: its revision no longer matches. Errors leave the current text available for correction. Closing or editing during preparation cannot leave controls permanently disabled.

In `src/webview/main.ts`, the Enter handler uses `selectionStart`, `selectionEnd` and `setRangeText` to insert indentation at the caret. It does not attempt to parse or rewrite an unfinished object. It skips IME composition and modifier shortcuts. Tab retains normal browser focus behavior, avoiding a keyboard trap. The Format button handles full-document conversion explicitly.

## Local resources and content security

The HTML allows only nonce-authorized scripts and local styles; networking is blocked. All payloads, paths, and errors are displayed through `textContent`, never `innerHTML`. `localResourceRoots` is restricted to compiled UI assets. It is a resource-loading rule, not a filesystem sandbox for the host.

Input and output remain in memory. We deliberately use neither `webview.setState` nor extension storage for payloads. Retaining the panel context while hidden preserves an active session across tab switches. Closing it disposes listeners and clears the host session.

## URIs and exclusive output

VS Code editor resources use URIs, not necessarily local paths. Editor loading preserves those document objects. Export explicitly supports local `file:` folders in version 0.1. Node filesystem operations are used there because exclusive `mkdir` and `writeFile` with `wx` give a clear no-overwrite guarantee. Remote/virtual exports are refused rather than assuming their URI paths are local.

Exports use controlled numbered filenames, not user property names. Sequential writes let us report exactly which files completed if storage becomes unavailable. The output index describes the exported candidates; it is not a payload fixture.

Next: [testing](05-testing-and-debugging.md).

Reference: [Webview API](https://code.visualstudio.com/api/extension-guides/webview).
