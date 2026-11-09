# 3. Parsing and independent mutations

## Why more than JSON.parse?

`JSON.parse` accepts strict JSON, but duplicate names are overwritten silently. It also reports errors differently across runtimes. `jsonc-parser` gives us a syntax tree and offsets so we can explain duplicates and syntax locations consistently. Despite its name, we configure it to reject comments and trailing commas.

`analyzeJson` first scans tokens to bound nesting before invoking the recursive tree parser. It validates the tree, including objects inside arrays, then uses `JSON.parse` to construct data. Arrays are validated fully but listed as atomic fields. This is a product boundary, not a parser limitation.

Large integers and non-finite numeric results are rejected. Otherwise a JSON number such as an oversized account ID could change before export. Ordinary decimals retain JavaScript number behavior; preserving arbitrary decimal precision is outside this release.

## Preparing editor snippets safely

`src/core/prepare.ts` is a separate preparation boundary. `prepareInput` first tries strict JSON; otherwise Acorn parses a wrapped object expression into an abstract syntax tree. It never evaluates that tree. Only JSON-compatible literal values, object properties and arrays are copied. Expressions such as `supplier?.supplierName` or shorthand `supplierId` become empty strings. A returned note reports the replacements. Spreads, computed keys and methods are rejected because their data cannot be known without execution.

The scanner bounds nesting/token work before parsing. Conversion checks duplicates before inserting into null-prototype objects, then runs the ordinary strict analyzer on the formatted result. Even the strict-JSON fast path rechecks formatted size because pretty-printing can expand compact data beyond 1 MiB. A failed Format action leaves the panel text intact.

`fillDummyValues` builds a fresh parsed value, fills empty/null leaves using property-name hints, then revalidates it. The explicit button keeps those guesses separate from importing. Existing populated values survive. Read `tests/unit/prepare.test.ts` for both reported editor examples and resource-limit tests.

Reference: [Acorn parser API](https://github.com/acornjs/acorn/blob/master/acorn/README.md).

## Why JSON Pointer?

`{"a.b":1,"a":{"b":2}}` contains two different properties. Dot notation would be ambiguous. We keep path segments and encode JSON Pointer for identifiers:

- `/a.b` → the literal `a.b` key.
- `/a/b` → property b inside a.
- `/a~1b` → the literal `a/b` key.
- `/` → the empty-string key.

## One clone for each case

Read `generateCases` in `src/core/generate.ts`. It chooses fields in source order and methods in a fixed order. For **each** pair it clones the baseline, navigates to the property's parent, and removes or replaces only that property. Cloning once outside the loop would accidentally make later mutations cumulative.

The engine skips inapplicable empty mutations, unchanged values, and duplicate resulting payloads. Limits fail the operation with an explanation rather than returning an incomplete set. A total output-byte limit also prevents a small input multiplied into many oversized copies from consuming excessive memory.

## Special keys

Keys such as `__proto__` are ordinary JSON data. `JSON.parse` and `Object.defineProperty` create own data properties. Avoid replacing this with arbitrary assignments into inherited objects, which could accidentally invoke prototype setters.

These variations are not proof that the input is invalid. An optional email may accept null; only your contract or application can decide.

Next: [messages and platform actions](04-webview-messages-and-output.md).
