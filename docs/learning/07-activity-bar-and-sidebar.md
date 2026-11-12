# 7. Activity Bar icon as a one-click launcher

The requested workflow is: click the JSON Edge Activity Bar icon, then use the full generator in the right-hand editor panel. There is no second Open Generator button or separate sidebar file list.

## 1. Provide the icon

`media/json-edge-activity.svg` is a transparent monochrome 24 × 24 SVG. This is separate from `media/icon.png`, the colored Marketplace icon. Replace the SVG while keeping its filename, or change the manifest's icon path, to customize it.

## 2. Declare the container and minimal view

VS Code's stable extension API contributes Activity Bar icons through view containers, rather than arbitrary clickable-icon commands. `package.json` therefore keeps `viewsContainers.activitybar` with ID `jsonEdge` and the icon path, plus a minimal view with ID `jsonEdge.generatedFiles`.

The view ID is kept for upgrade compatibility. Its old generated-file provider and welcome action have been removed. Files continue to live in the generator's editor panel.

Microsoft's normal Activity Bar UX recommendation is to display sidebar content. This implementation deliberately follows the user's requested shortcut behavior: a small launcher view handles visibility, opens the generator, and closes its own sidebar. The native sidebar may briefly activate while VS Code routes the click; the intended final layout is the editor panel. This shortcut targets its contributed primary Activity Bar location. Relocating the launcher view to the Secondary Side Bar or bottom Panel is outside its support scope: the stable TreeView API exposes no containing-part location, so the close action targets the primary sidebar. Keep the launcher in its default location.

## 3. Register the launcher

`src/sidebar/launcher.ts` exports `registerActivityLauncher`. It creates an empty tree view and listens to `onDidChangeVisibility`. When that view becomes visible, it calls the supplied toggle callback, then closes the launcher sidebar. Before closing, it checks that its own view is still visible, so switching to another sidebar during opening is respected.

The `launching` flag serializes work, while `queued` remembers a new visibility event during an asynchronous open/close so rapid follow-up clicks are not lost. An initial visibility check covers the case where activation happens after the icon's view has already become visible. Disposal removes the listener and guards late asynchronous work.

`src/extension.ts` registers `jsonEdge.open` before creating the launcher. That command creates the panel once, then reveals an existing panel. The Activity Bar callback executes the internal `jsonEdge.toggle` command, which separately checks panel.visible: a visible panel is disposed, while a hidden or absent panel is opened/revealed. This separation keeps the Command Palette and context menu as always-open actions. Its shared opening promise prevents duplicate tabs while the HTML template loads and lets all callers await the same creation task. The existing panel retains input and generated cases until closed.

## Try and debug it

Compile and press F5, then click the braces/arrows icon in the Extension Development Host. The complete generator should open in the right-hand editor immediately. Generate files and click the icon again: the generator closes and its memory-only session is cleared. Click the icon again to reopen it. Run JSON Edge: Open twice to verify it reveals one existing panel without toggling it closed.

Set breakpoints in the launch function and the Open command to follow the handoff. Installed users must install the updated VSIX and run Developer: Reload Window to replace old manifest contributions. If the icon is hidden, right-click the Activity Bar and enable JSON Edge.

The extension-host tests exercise view activation and panel creation. The real-editor smoke clicks the actual icon, checks there is no second button, checks repeated-click closing/reopening and verifies the normal copy/export workflow.

References: [Tree View API](https://code.visualstudio.com/api/extension-guides/tree-view), [Activity Bar guidance](https://code.visualstudio.com/api/ux-guidelines/activity-bar).
