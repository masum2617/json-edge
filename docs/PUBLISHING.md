# Publish JSON Twist to the VS Code Marketplace

This is the first-release guide for the repository owner. No Marketplace publication has been performed. The repository is public at [masum2617/json-twist](https://github.com/masum2617/json-twist), with `main` as its default branch. The owner has created the publisher `masum-hasan`, and the manifest uses that ID. The extension identifier is `masum-hasan.json-twist`.

The manual VSIX upload route below avoids setting up publishing tokens. Microsoft also supports CLI publishing; manual upload is a choice, not a special first-release requirement. [Official publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

## 1. Create your publisher

1. Open [Marketplace publisher management](https://marketplace.visualstudio.com/manage).
2. Sign in with the Microsoft account you want to own this extension. Create an account if needed.
3. Choose **Create publisher**. Supply your publisher name and the unique publisher ID requested by the form.
4. Copy the exact **publisher ID**, not just its display name. This is public identity metadata; it is not a password or token.

The installed extension identifier will be `YOUR_PUBLISHER_ID.json-twist`. Keep ownership/access to that publisher account. If the portal's labels change, follow the publisher section of Microsoft's current guide rather than guessing account or organization settings.

## 2. Set that ID in the project

Open the `edgecasemaker` project folder and run, replacing the example ID with yours:

```sh
npm pkg set publisher=YOUR_PUBLISHER_ID
npm run release:check
```

The manifest now uses `masum-hasan`; the release check rejects placeholder publisher IDs. Do not upload a VSIX with a placeholder publisher. The first public package name is `json-twist`; the older `json-edge-case-maker` identity was used for local development. The visible name is JSON Twist — Edge Case Generator, and the existing command ID remains stable.

Review `package.json`: version, publisher, description, Testing category, repository, issues URL, homepage and icon. The repository metadata and `main` branch are already configured. The first candidate is 0.1.5. After a version has been published, increment it before publishing another build.

## 3. Review the public content and media

- Read README, user guide, privacy notes and changelog. Examples should use generic profile fields such as name, email and age.
- Play the GIF and MP4, and open all four numbered Marketplace screenshots listed in [Demo assets](release/DEMO.md).
- The images must show the actual current app, with synthetic values only. Verify text is readable at normal size.
- The README uses neutral installation instructions without claiming a live listing. Add the actual listing/install link only after publication, and record the actual release date in the changelog.

The SVG is the Activity Bar icon. The Marketplace icon is the separate PNG in `media/icon.png` (at least 128 × 128 pixels). [Manifest requirements](https://code.visualstudio.com/api/references/extension-manifest).

## 4. Commit and push the release files to GitHub

Marketplace README links and image URLs are rewritten to the public repository. Assets must actually exist on `main` before uploading; bundling a local GIF alone does not make its rewritten public URL work.

Review changes first:

```sh
git status --short
git diff --check
git diff --stat
```

Commit the intended source, docs and media, then push them using your usual Git workflow. The project no longer ignores `docs/`. Do not commit `node_modules`, temporary recordings, real customer data or credentials.

Open these public URLs and confirm the media loads after pushing:

- [GIF](https://raw.githubusercontent.com/masum2617/json-twist/main/docs/media/json-twist-demo.gif)
- [MP4](https://github.com/masum2617/json-twist/blob/main/docs/media/json-twist-demo.mp4)
- [Input screenshot](https://raw.githubusercontent.com/masum2617/json-twist/main/docs/images/marketplace-input.png)
- [Preview screenshot](https://raw.githubusercontent.com/masum2617/json-twist/main/docs/images/marketplace-preview.png)

## 5. Run release checks and create the final VSIX

Use Node 24 LTS for the release workflow:

```sh
npm ci
npm run package:release
npm run test:ui
npm run test:package
```

Install the test browser once with `npx playwright install chromium` if needed. The package test downloads VS Code Stable unless `VSCODE_EXECUTABLE_PATH` selects your installed executable. All tests use temporary profiles; runtime users need no development tools.

In GitHub Actions, run/inspect **Validate extension** on `main`. It defines macOS, Windows and Linux checks. Do not treat the presence of a workflow file as a successful run. Resolve failed jobs before uploading.

The file to upload is `artifacts/json-twist-0.1.5.vsix`, built **after** setting your real publisher ID. Inspect the contents (`npm run package:list`) and install that exact VSIX locally. Older local-development builds should be uninstalled before installing a differently identified public build to avoid duplicate commands.

Confirm the Activity Bar icon opens the generator in one click, selected editor JSON loads, every variation previews correctly, copying returns the selected JSON, and optional export works. A final package is different from the earlier local preview if metadata/assets changed; retest that final artifact.

## 6. Upload through the publisher portal

1. Return to [publisher management](https://marketplace.visualstudio.com/manage) and select your publisher.
2. Choose **New extension → Visual Studio Code**.
3. Upload the final VSIX from step 5.
4. Review the extension identity/details and submit using the portal's controls.
5. Wait for the portal's validation/publication status. Uploading does not itself prove the listing is live.

For subsequent releases, use the existing extension's update action and a higher version. Do not create a second listing for ordinary updates.

## 7. Verify the live listing

Open the actual Marketplace listing and confirm its description, PNG icon, GIF rendering, screenshots and links. Install from Marketplace in a clean VS Code profile and test the complete workflow again. Update the README with the real listing URL only after it exists. Optionally create a GitHub release containing the exact published VSIX and MP4.

If animation does not render in the listing, keep the static preview image visible and retain the MP4 link; do not replace real captures with a mockup. Record the actual release version/date and successful CI results in the release notes.

## What is prepared vs. still yours to complete

Prepared locally: public docs, generic examples, GIF/MP4, screenshots, repository metadata, identity/media gate, package tooling and local verification.

Publisher creation and manifest configuration are complete. Before publication, confirm public assets and remote CI, install/test the publisher-specific VSIX, upload it, and verify its live listing. No account creation, Git push or Marketplace upload is performed by the preparation scripts.
