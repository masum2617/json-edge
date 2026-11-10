# Release preparation snapshot — 2026-11-10

This records local preparation of JSON Twist 0.1.5. It does not claim GitHub changes were pushed, remote CI ran, or Marketplace publication occurred. The owner has confirmed creation of publisher `masum-hasan`.

## Completed locally

- Type checking, ESLint and formatting passed; 26 Node unit tests passed.
- 11 panel tests passed, including light/dark/forced-color checks, keyboard navigation, narrow layout, stale results and generic snippet conversion.
- The packaged extension installed in a temporary VS Code profile and passed extension-host checks for one-click opening/reopening, CSP, clipboard behavior, freshness, source preservation and local exports.
- The actual desktop UI smoke passed editor selection, generation, preview, exact copied JSON, optional export cancellation/completion, repeated-click panel reuse, generic snippets and dummy values. It waits for export completion before counting sequentially written files.
- npm audit reported zero advisories for the current lockfile. Local development checks used Node 26.3.1 on macOS; CI targets Node 24.
- Project-specific public examples were replaced with generic profile data. Public docs are no longer ignored by Git. Local relative documentation links were checked.
- Four 1440 × 1000 PNG screenshots were captured from the actual installed extension with synthetic data and no visible temporary breadcrumbs.
- A roughly 13-second looping GIF and H.264 MP4 were recorded. GIF loop/frame metadata, first/middle/last frames and MP4 decoding were checked. The final copied state is real; its viewing hold is an editorial freeze frame, not a performance claim.
- The public GitHub repository and main branch were verified anonymously. Package README image/video links rewrite to HTTPS GitHub main URLs. Runtime assets/libraries, GIF, current screenshots and docs are included; development sources/tests/tooling and the hosted MP4 companion are excluded.
- Read-only code/release review found no actionable issues in the preparation changes.

The demo manifest records current frame count, duration, version and output sizes. Screenshot/GIF dimensions were verified separately. The manifest now uses `masum-hasan.json-twist`; rebuild the package after changing publisher metadata.

## Expected release gate

The owner supplied publisher ID `masum-hasan`, which is now saved in the manifest. The release check validates local metadata and assets; it does not authenticate publisher ownership or establish remote CI/publication status.

## Owner steps still required

1. Publisher `masum-hasan` has been created and configured (completed).
2. Review, commit and push the intended source/docs/media to GitHub main; verify public asset URLs.
3. Run and inspect the actual Linux/macOS/Windows CI jobs. Their workflow is configured but those remote runs were not executed here.
4. Build and install/test the final publisher-specific VSIX.
5. Upload via the publisher portal and verify the actual listing, GIF/images/links and Marketplace installation.

Follow [Publish JSON Twist](../PUBLISHING.md). Account creation, Git push and upload are owner actions; no publishing credentials were requested or stored.
