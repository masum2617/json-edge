# 1. Your first VS Code extension

A VS Code extension is a package that contributes features to the editor. Our extension runs TypeScript compiled into JavaScript in the **extension host**, a separate process from the editor UI. It is not a website server.

## The manifest is the front door

Read `package.json`. `contributes.commands` gives our Open command an ID, a category, and a title. `contributes.menus` places the same command in the JSON editor's context menu. `main` points to the compiled extension entry point. `engines.vscode` declares the oldest supported editor version.

Modern VS Code activates contributed commands automatically; we do not need startup activation or a separate `onCommand` activation entry. VS Code calls `activate(context)` in `src/extension.ts` the first time the command is used. `registerCommand` connects its ID to a function.

## Disposables are cleanup handles

Registering listeners returns objects with a `dispose()` method. Putting them in `context.subscriptions` lets VS Code clean them up when the extension is deactivated. A panel has its own shorter lifetime, so its listeners belong to its controller.

## Compile, then press F5

1. Run `npm ci` and `npm run compile`.
2. Open the extension folder, not its parent folder.
3. Press F5 and select **Run Extension** if asked.
4. In the new Extension Development Host, run **JSON Edge: Open**.
5. Set a breakpoint in the command callback to see activation and execution.

The launch configuration runs the compile task first. Source maps connect generated JavaScript back to TypeScript. After a change, compile and reload the development host. Closing the test window does not uninstall anything from your normal VS Code profile.

Next: [walk through a request](02-project-walkthrough.md).

Reference: [Your First Extension](https://code.visualstudio.com/api/get-started/your-first-extension).
