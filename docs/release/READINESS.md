# JSON Edge 0.1.6 release preparation — 2026-11-10

This release renames the current project to **JSON Edge - The Edge Case Maker**, with package identity `masum-hasan.json-edge` and repository `masum2617/json-edge`.

JSON Twist (`masum-hasan.json-twist`) remains a separate previous Marketplace listing. Existing installations do not migrate automatically. The old listing is not deleted by this release.

## Validation

Local source checks passed (29 Node tests), along with 11 browser UI tests. The renamed package installed and passed real VS Code integration checks. Fresh screenshots show the actual installed 0.1.6 UI, and that release used generated demo captures. The current demo has since been replaced by the owner-provided `jsonedgedemo.mp4`; see `DEMO.md` for its verification. The exact VSIX manifest, archive integrity and local resource paths were checked. Rebuild and retest after subsequent changes.

The previous Windows launcher fix supports both legacy and versioned VS Code resource directories. CI should validate this release on Linux, macOS and Windows before publication. A previous version's successful run does not establish the renamed release's result.

## Publication

The GitHub repository and local project folder are renamed to `json-edge`, and the Git remote uses the new repository URL. Commit/push the intended changes and inspect the new CI run. Publish this package as a **new Visual Studio Code extension**, rather than uploading it as an update to JSON Twist. Confirm the new listing's name, publisher, version, demo, screenshots and installation.

The release scripts validate local files and build the VSIX; they do not publish automatically.
