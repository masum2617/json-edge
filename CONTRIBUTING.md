# Contributing

This project is intentionally small enough to understand as a first VS Code extension. Use Node.js 22.14+ or 24 LTS, run `npm ci`, and follow the README development commands.

## Code conventions

- Keep JSON behavior in `src/core/`, independent of `vscode` and the DOM. Add a focused unit test when changing behavior.
- Keep the panel controller responsible for platform actions and messaging; the webview handles presentation.
- Use strict TypeScript, descriptive names, and small functions. Prefer plain objects and functions over additional frameworks or generic service layers.
- Add comments for reasoning, limits, and VS Code-specific concepts. Do not comment obvious syntax. Keep learning walkthroughs consistent with implementation.
- Do not use `innerHTML`, inline event handlers, network resources, persistent payload storage, or arbitrary executable input.
- Do not modify source documents as a side effect of generation.

Run `npm run format` before `npm run check`. For UI changes, also run `npm run test:ui` and inspect keyboard behavior, narrow layouts, light/dark/high-contrast themes, and error messages. Use `npm run test:integration` when changing platform behavior and `npm run test:package` for release candidates.

CI covers unit, panel UI, extension-host, and packaged-VSIX smoke tests on Linux, macOS, and Windows. A workflow file alone does not mean those remote checks have passed; inspect an actual CI run before claiming cross-platform verification.

## Reporting a problem

Until a public repository is configured, report issues to the project owner. Once configured, use its issue tracker. Include OS, VS Code version, reproduction steps, expected/actual behavior, and a **synthetic** JSON example. Do not attach credentials or real customer data.

## Dependency maintenance

`jsonc-parser` is the only runtime dependency. Test, lint, and packaging tools are development-only. Patched `glob` and `minimatch` overrides address transitive tooling advisories; rerun the complete package tests when updating them. Validate with `npm audit` and `npm audit --omit=dev` when registry access is available.
