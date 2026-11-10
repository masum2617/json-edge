# Using JSON Edge

## Install a local VSIX

Run **Extensions: Install from VSIX…** in VS Code, choose `json-edge-0.1.6.vsix`, then reload the window. Published releases can also be installed using the Marketplace listing’s Install button.

JSON Edge uses `masum-hasan.json-edge`. JSON Twist (`masum-hasan.json-twist`) is a separate earlier listing. Install JSON Edge explicitly and uninstall JSON Twist if you no longer need it. Earlier local-development builds are also separate extensions.

## Open and supply input

Click the braces/arrows icon in the primary Activity Bar, or run **JSON Edge: Open**. The full generator opens on the right. Repeated clicks reveal the same panel, preserving your work. If the icon is hidden, right-click the Activity Bar and enable JSON Edge.

The initial input is the selection from your last active editor. With no selection, the whole JSON/JSONC document is used; otherwise the panel opens empty. Paste JSON directly or use **Load from Active Editor**. No source file needs to be saved, and source documents are never edited.

```json
{
  "name": "Alex",
  "email": "alex@example.com",
  "age": 25,
  "address": { "city": "Dhaka" },
  "tags": ["member"]
}
```

## Choose fields and generate

Use the field search to narrow the list. Check fields and one or more variations. Generate runs only when you click **Generate edge cases**.

| Variation  | Behavior                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| Missing    | Remove the selected property.                                                                                            |
| Null       | Replace its value with `null`; skip values already null.                                                                 |
| Empty      | Strings → `""`, arrays → `[]`, objects → `{}`; skip other types and already-empty values.                                |
| Wrong type | String → `123`; number → `"not-a-number"`; boolean → `"not-a-boolean"`; object → `[]`; array → `{}`; null → `"example"`. |

Every candidate starts from the same original input and changes one property. Parent and child selections are independent. Source field order and variation order are deterministic; duplicate resulting payloads and unchanged values are skipped.

## Preview, copy and optionally save

Generate brings the JSON file list into view. Click a filename to see its full JSON and explanation. **Copy JSON** copies the current preview. Use Up/Down or Home/End to switch files with the keyboard.

Changing input, field choices or variations marks the files outdated and disables copying/exporting until regeneration. Field search and export-checkbox changes do not change generation settings.

To save, expand **Save files to disk (optional)**, choose files, then **Export selected**. Select a local parent folder; a uniquely named `json-edge-cases-...` child folder is created. Filenames match the preview names even for subsets. `index.json` describes each fixture and its mutation; it is metadata, not another test input. Existing files are never overwritten. A partial failure reports completed filenames and the failed filename; completed files remain available.

Cancelling the folder picker writes nothing. Generating, previewing and copying never write files.

## Format and dummy values

Select an object or property list, not a whole declaration/function:

```js
userId,
name: profile?.name,
email: profile?.email,
isActive,
```

Import/Format JSON adds braces and quotes keys, handles single quotes/comments/trailing commas, and replaces runtime expressions with empty strings. The note reports replacements. Literal JSON-compatible data is retained. Computed keys, spreads, object methods/getters, array holes and BigInt are rejected because conversion cannot safely determine their data.

Enter carries indentation and adds two spaces after opening braces/brackets. Between adjacent `{}` or `[]`, it inserts an indented blank line. Full formatting is explicit so incomplete typing and the caret are preserved. Tab retains normal keyboard focus navigation.

**Fill dummy values** converts the snippet, then fills only empty strings/nulls using name hints: `userId` → `1`, `name` → `"Alex"`, `email` → `"alex@example.com"`, `age` → `25`, `isActive` → `true`. Existing populated values, numbers/booleans and empty collections are preserved. These are editable guesses, not schema-aware type inference.

## Paths, limits and troubleshooting

JSON Pointer `/address/city` targets a nested field. A literal slash becomes `~1`, a tilde becomes `~0`, and `/` represents an empty key. Array items are not individually selectable.

Input is capped at 1 MiB UTF-8, depth 32 edges below the root, and 2 MiB combined field paths. Results are capped at 250 cases and 16 MiB generated JSON. Formatting can expand compact JSON beyond the input limit; failed formatting leaves the current input intact. Reduce the example or select fewer fields when a limit is exceeded.

Unsafe integers/non-finite numbers are rejected. Encode large IDs as strings. Ordinary decimal values use JavaScript number semantics.

Use desktop VS Code and local folders. Browser-hosted VS Code, remote development and relocated Activity Bar launcher views are outside the verified scope. Keep the launcher in its default primary Activity Bar location. Report reproducible problems with synthetic JSON via [GitHub Issues](https://github.com/masum2617/json-edge/issues).
