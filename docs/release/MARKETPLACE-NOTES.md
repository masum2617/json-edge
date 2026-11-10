# Marketplace preparation notes

Verified 2026-11-10 against Microsoft documentation and Microsoft-maintained `vsce` source. These are release preparation notes, not evidence of publication.

## Identity and manifest

- Required: lowercase, space-free extension `name`, SemVer `version`, actual `publisher` identifier, and compatible `engines.vscode` (not `*`). Extension IDs use `publisher.name`. Keep the existing package name unless deliberately changing its identity; the public display name can say JSON Twist.
- Choose allowed categories that describe the product; `Testing` and `Other` are available. Repository, homepage and bugs links become Marketplace resource links. Microsoft recommends `SEE LICENSE IN LICENSE` when a root LICENSE exists. [Manifest reference](https://code.visualstudio.com/api/references/extension-manifest)
- Include a PNG icon at least 128 × 128 pixels. README/CHANGELOG images must resolve over HTTPS; user SVG images are restricted. [Publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#marketplace-integration)

## README and media

- Root README content becomes the listing. Public GitHub repository metadata enables relative-link rewriting; `main` is the default branch. `--githubBranch main` can make the choice explicit. Keep linked docs/media available publicly on that branch. [Publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#marketplace-integration)
- Recommendation: show an actual captured demo as `![JSON Twist demo](docs/media/json-twist-demo.gif)` and provide a normal MP4 download/watch link. GIF display is an inference from image handling, not an explicit format guarantee in these docs. Do not promise inline MP4 playback: `vsce` rewrites relative `<video src>` attributes, but packaging acceptance does not establish Marketplace rendering. Inspect the installed extension details and eventual listing. [Microsoft vsce Markdown processor](https://github.com/microsoft/vscode-vsce/blob/main/src/package.ts)
- Remove scaffold README text: `vsce` explicitly rejects the generator placeholder. Product copy should explain real inputs, outputs, commands and limitations; keep contributor/release instructions in separate docs. [Microsoft vsce README check](https://github.com/microsoft/vscode-vsce/blob/main/src/package.ts)

## Packaging and first publication

- Use `.vscodeignore` to omit development-only files, retaining runtime assets and listing files. [Publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#using-vscodeignore)
- Publishing requires an owned Marketplace publisher and account access. The guide supports CLI publishing or uploading a packaged VSIX through [publisher management](https://marketplace.visualstudio.com/manage); it does **not** require a manual first upload. For automation, current guidance recommends federated identity; global Azure DevOps PAT retirement is December 1, 2026. [Publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#publish-an-extension)

Release blocker: confirm the real publisher ID and account ownership before generating the final publishable package. `local-development` is a development placeholder, not a confirmed publisher. No publication was performed by this research task.
