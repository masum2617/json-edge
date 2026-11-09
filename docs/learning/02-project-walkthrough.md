# 2. Follow one request through the project

Use this map while reading the code:

| Location                           | Responsibility                                                                     |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| `src/extension.ts`                 | Activate, register Open, remember the last text editor.                            |
| `src/panel/`                       | Create the webview, load safe HTML, route messages.                                |
| `src/core/`                        | Validate JSON, discover fields, generate cases, track freshness, describe exports. |
| `src/protocol.ts`                  | Define and validate the panel message contract.                                    |
| `src/output.ts`                    | Write an isolated export directory using exclusive filesystem creation.            |
| `src/webview/main.ts` and `media/` | Render controls, choices, previews, and theme-aware styling.                       |
| `tests/`                           | Core, platform, and UI behavior checks.                                            |

## Example: null email

1. You click Open. `extension.ts` creates an `EdgeCasePanel`.
2. `panelHtml` loads a static HTML template and substitutes controlled resource URLs and a nonce. User JSON is never embedded in that HTML.
3. The browser script sends `ready`. The controller prepares the selected object/properties through `src/core/prepare.ts`, then sends formatted JSON and a conversion note back in a `source` message.
4. Editing input increments a revision and invalidates results immediately. Analysis is debounced to avoid reparsing after every keystroke.
5. `analyzeJson` returns fields such as `/email`. The user checks that field and the null variation.
6. Generate sends the input and selections to `GenerationSession.generate`. The core creates a fresh copy, changes only email, and returns labelled JSON.
7. The UI displays the result using `textContent`. Copy asks the host to validate freshness and write the selected JSON to the clipboard.

The core has no VS Code dependency. You can understand and test its behavior without launching an editor window. The UI never writes files directly.

Next: [JSON transformations](03-parsing-and-safe-generation.md).
