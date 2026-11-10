# 6. Packaging and publishing

A VSIX is the installable extension archive. Run `npm run package` to compile and create `artifacts/json-edge-0.1.6.vsix`. `npm run package:list` lists included files. The ignore file excludes sources/tests/tooling and the large MP4 companion; it keeps the compiled host/UI, runtime libraries, PNG/SVG icons, public docs, GIF and current screenshots.

`package.json` uses the public repository and main branch for README link rewriting. Its publisher remains `local-development` until the owner creates a Marketplace publisher. `npm run package:release` refuses that placeholder through `scripts/release-check.cjs`; a local package is not proof of Marketplace readiness.

The new package identity is `masum-hasan.json-edge`, with command `jsonEdge.open`. JSON Twist (`masum-hasan.json-twist`) was a separate previous listing. Changing the package name creates a new extension; existing users must install JSON Edge explicitly.

Follow [Publish JSON Edge](../PUBLISHING.md) for the current, step-by-step account creation, identity setup, public asset checks, final build/tests and manual VSIX upload workflow. No tokens are needed for that manual upload route. Account ownership, Git pushes and Marketplace publication remain owner actions.

Learn the distinction between preparation and publication: a build may be valid but still lack a real publisher, public media URLs or a live listing. Install the exact final artifact and inspect the actual listing before claiming launch success.

Next: [Activity Bar launching](07-activity-bar-and-sidebar.md).

References: [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension), [Extension Manifest](https://code.visualstudio.com/api/references/extension-manifest).
