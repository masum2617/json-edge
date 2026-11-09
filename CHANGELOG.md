# Changelog

## 0.1.1 — Local update

- Convert editor selections and object property lists to formatted strict JSON, including unquoted keys, single quotes and trailing commas.
- Replace variable expressions/shorthand with empty strings without executing code; report substitutions and reject unresolved property names/spreads.
- Add Format JSON, two-space indentation on Enter, and deterministic Fill dummy values for empty/null fields.
- Protect preparation responses with revisions and revalidate formatting output limits.
- Add focused snippet, editing, race and packaged dependency regression checks.

## 0.1.0 — Unreleased

- Custom VS Code panel for strict JSON input and selectable nested object fields.
- Missing, null, empty, and deterministic wrong-type variations, one property per case.
- JSON preview, clipboard copy, and selected fixture export with an explanatory index.
- Input/output limits, duplicate-key validation, stale-result protection, and partial-export reporting.
- Unit, webview, extension-host, and packaged-release tests; separate beginner learning guides.

This is a local release candidate. Marketplace publication and public repository metadata are pending.
