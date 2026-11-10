# 6. Packaging and publishing

## A VSIX is the installable extension

`npm run package` compiles and creates `artifacts/json-edge-case-maker-0.1.4.vsix`. `npm run package:list` shows included files. `.vscodeignore` excludes development sources, tests, caches, and tooling, while retaining the compiled host, UI, icon, and `jsonc-parser` and `acorn` runtimes.

Install with **Extensions: Install from VSIX…**, then open the panel and try a synthetic example. `npm run test:package` also installs this exact artifact into an isolated profile and checks its runtime behavior.

The current manifest intentionally uses `local-development`. Packaging permits missing repository metadata and keeps relative links unchanged for this local candidate. Once a real repository is configured, the package script enables normal link rewriting. `npm run release:check` refuses publication readiness until the owner supplies real metadata; do not publish a placeholder identity.

## Prepare a public release

1. Create the public source repository and choose a Marketplace publisher ID. Check the permanent extension ID's availability in Marketplace; a web search is not a reservation.
2. Set `publisher`, `repository`, `bugs`, and `homepage` in `package.json` to the owner's real HTTPS URLs. Update the README and changelog to match the actual release state.
3. Use the supplied PNG icon. README screenshots must be real captures with synthetic data; publish relative assets through the repository so Marketplace can resolve them. Do not substitute the earlier concept image for a real product screenshot.
4. Run the release checks and inspect the final VSIX. Repackage after metadata changes; rerun installation and smoke tests on that final artifact.
5. Use the publisher management portal's **New extension → Visual Studio Code → upload VSIX** flow for the first release. Account creation/login and publisher ownership belong to the user. Do not paste authentication tokens into chat or commit them.
6. Confirm the actual listing and install from it before claiming Marketplace availability.

The official guide covers manifest compatibility, allowed image formats, publisher setup, package contents, and current authentication options. Read it at release time because account and publishing procedures can change. Manual upload avoids introducing automated publishing credentials for the first release. CI here validates and packages; it does not publish.

## Version updates

Keep SemVer, changelog, package output name, and package test path consistent. The initial candidate was 0.1.0; the snippet/editing update was 0.1.1, and the JSON Twist virtual-file browser is 0.1.2. Fix reports with focused regression tests, package a new version, and verify the artifact again. Add schema constraints or array-item targeting only after the basic workflow is reliable.

Reference: [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

Next: [Activity Bar launching](07-activity-bar-and-sidebar.md).
